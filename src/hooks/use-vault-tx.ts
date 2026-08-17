import { formatUnits, parseUnits, maxUint256, type Address } from "viem";
import {
  useAccount,
  useChainId,
  useConfig,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { readContract, simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi } from "viem";

import { decodeChainError } from "@/lib/chain-error";
import type { Catalog } from "@/lib/load-catalog";
import { networkIdFromChainId, walletAddChainParams } from "@/lib/networks";
import { erc721Abi, vaultAbi } from "@/lib/protocol-abi";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export function useVaultTx() {
  const config = useConfig();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  async function ensureChain(target: number, rpcUrl?: string) {
    if (chainId === target) return;
    try {
      await switchChainAsync({ chainId: target });
    } catch {
      const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      if (!eth) throw new Error("MetaMask is not available");
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [walletAddChainParams(networkIdFromChainId(target), rpcUrl)],
      });
      await switchChainAsync({ chainId: target });
    }
  }

  async function wait(hash: `0x${string}`) {
    return waitForTransactionReceipt(config, { hash });
  }

  async function send(params: Parameters<typeof writeContractAsync>[0]) {
    try {
      await simulateContract(config, params as never);
      const hash = await writeContractAsync(params);
      return wait(hash);
    } catch (err) {
      throw new Error(decodeChainError(err));
    }
  }

  async function mint(catalog: Catalog, assetId: string, planId: string, amountInput: string) {
    if (!catalog.protocol) throw new Error("Vault is not deployed on this network.");
    if (!address) throw new Error("Connect MetaMask first");
    const token = catalog.tokens.find((item) => item.id === assetId);
    const plan = catalog.plans.find((item) => item.id === planId);
    const onChainId = plan?.onChainId ?? catalog.protocol.planIds[planId];
    if (!token || !plan || !onChainId) {
      throw new Error("This plan is not on the vault. Deploy after saving plans.");
    }
    await ensureChain(catalog.protocol.chainId, catalog.protocol.rpcUrl);
    const amount = parseUnits(amountInput, token.decimals);
    const allowance = (await readContract(config, {
      address: token.address,
      abi: erc20Abi,
      functionName: "allowance",
      chainId: catalog.protocol.chainId,
      args: [address, catalog.protocol.vault],
    })) as bigint;
    if (allowance < amount) {
      await send({
        address: token.address,
        abi: erc20Abi,
        functionName: "approve",
        chainId: catalog.protocol.chainId,
        args: [catalog.protocol.vault, maxUint256],
      });
    }
    return send({
      address: catalog.protocol.vault,
      abi: vaultAbi,
      functionName: "mint",
      chainId: catalog.protocol.chainId,
      args: [token.address, BigInt(onChainId), amount, ZERO],
    });
  }

  async function claim(catalog: Catalog, tokenId: number) {
    if (!catalog.protocol) throw new Error("Vault is not deployed");
    if (!address) throw new Error("Connect MetaMask first");
    await ensureChain(catalog.protocol.chainId, catalog.protocol.rpcUrl);
    return send({
      address: catalog.protocol.vault,
      abi: vaultAbi,
      functionName: "claim",
      chainId: catalog.protocol.chainId,
      args: [BigInt(tokenId)],
    });
  }

  async function unlock(catalog: Catalog, tokenId: number) {
    if (!catalog.protocol) throw new Error("Vault is not deployed");
    if (!address) throw new Error("Connect MetaMask first");
    await ensureChain(catalog.protocol.chainId, catalog.protocol.rpcUrl);
    return send({
      address: catalog.protocol.vault,
      abi: vaultAbi,
      functionName: "unlock",
      chainId: catalog.protocol.chainId,
      args: [BigInt(tokenId)],
    });
  }

  async function emergencyExit(catalog: Catalog, tokenId: number) {
    if (!catalog.protocol) throw new Error("Vault is not deployed");
    if (!address) throw new Error("Connect MetaMask first");
    await ensureChain(catalog.protocol.chainId, catalog.protocol.rpcUrl);
    return send({
      address: catalog.protocol.vault,
      abi: vaultAbi,
      functionName: "emergencyExit",
      chainId: catalog.protocol.chainId,
      args: [BigInt(tokenId)],
    });
  }

  async function transferCard(catalog: Catalog, tokenId: number, to: Address) {
    if (!catalog.protocol) throw new Error("Vault is not deployed");
    if (!address) throw new Error("Connect MetaMask first");
    await ensureChain(catalog.protocol.chainId, catalog.protocol.rpcUrl);
    return send({
      address: catalog.protocol.card,
      abi: erc721Abi,
      functionName: "transferFrom",
      chainId: catalog.protocol.chainId,
      args: [address, to, BigInt(tokenId)],
    });
  }

  return {
    address,
    chainId,
    ensureChain,
    mint,
    claim,
    unlock,
    emergencyExit,
    transferCard,
    formatUnits,
  };
}
