"use client";

import { type Abi, type Address } from "viem";
import { useAccount, useChainId, useConfig, useSwitchChain } from "wagmi";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";

import { decodeChainError } from "@/lib/chain-error";
import { useCatalogRefresh } from "@/hooks/use-catalog";
import type { SeedPlan } from "@/lib/lab/plan-codec";
import { toVaultPlan, usdToUsd8 } from "@/lib/lab/plan-codec";
import { walletAddChainParams } from "@/lib/networks";

const vaultWriteAbi = [
  {
    type: "function",
    name: "addPlan",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "plan",
        type: "tuple",
        components: [
          { name: "slug", type: "bytes32" },
          { name: "lockSeconds", type: "uint32" },
          { name: "minUsd8", type: "uint256" },
          { name: "maxUsd8", type: "uint256" },
          { name: "apyBps", type: "uint16" },
          { name: "emergencyFeeBps", type: "uint16" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    outputs: [{ name: "planId", type: "uint256" }],
  },
  {
    type: "function",
    name: "updatePlan",
    stateMutability: "nonpayable",
    inputs: [
      { name: "planId", type: "uint256" },
      {
        name: "plan",
        type: "tuple",
        components: [
          { name: "slug", type: "bytes32" },
          { name: "lockSeconds", type: "uint32" },
          { name: "minUsd8", type: "uint256" },
          { name: "maxUsd8", type: "uint256" },
          { name: "apyBps", type: "uint16" },
          { name: "emergencyFeeBps", type: "uint16" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setAsset",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setReferralBps",
    stateMutability: "nonpayable",
    inputs: [{ name: "bps", type: "uint16" }],
    outputs: [],
  },
  {
    type: "function",
    name: "planCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const oracleWriteAbi = [
  {
    type: "function",
    name: "setPrice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "priceUsd8", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export function useOwnerTx() {
  const config = useConfig();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { catalog, refresh } = useCatalogRefresh();

  async function ensure() {
    if (!address) throw new Error("Connect the deployer MetaMask wallet");
    const protocol = catalog?.protocol;
    if (!protocol) throw new Error("Vault is not deployed yet");
    if (chainId !== protocol.chainId) {
      try {
        await switchChainAsync({ chainId: protocol.chainId });
      } catch {
        const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
        if (!eth) throw new Error("MetaMask is not available");
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [walletAddChainParams(protocol.networkId, protocol.rpcUrl)],
        });
        await switchChainAsync({ chainId: protocol.chainId });
      }
    }
    return protocol;
  }

  async function send(params: Parameters<typeof writeContract>[1]) {
    try {
      const hash = await writeContract(config, params);
      await waitForTransactionReceipt(config, { hash });
    } catch (err) {
      throw new Error(decodeChainError(err));
    }
  }

  async function syncPlan(plan: SeedPlan, existingId?: number | null) {
    const protocol = await ensure();
    const args = toVaultPlan(plan);
    if (existingId) {
      await send({
        address: protocol.vault,
        abi: vaultWriteAbi as Abi,
        functionName: "updatePlan",
        args: [BigInt(existingId), args],
      });
      return existingId;
    }
    await send({
      address: protocol.vault,
      abi: vaultWriteAbi as Abi,
      functionName: "addPlan",
      args: [args],
    });
    const count = (await readContract(config, {
      address: protocol.vault,
      abi: vaultWriteAbi as Abi,
      functionName: "planCount",
    })) as bigint;
    return Number(count);
  }

  async function setAsset(token: Address, active: boolean) {
    const protocol = await ensure();
    await send({
      address: protocol.vault,
      abi: vaultWriteAbi as Abi,
      functionName: "setAsset",
      args: [token, active],
    });
  }

  async function setPrice(token: Address, priceUsd: number) {
    const protocol = await ensure();
    await send({
      address: protocol.oracle,
      abi: oracleWriteAbi as Abi,
      functionName: "setPrice",
      args: [token, usdToUsd8(priceUsd)],
    });
  }

  async function setReferralBps(bps: number) {
    const protocol = await ensure();
    await send({
      address: protocol.vault,
      abi: vaultWriteAbi as Abi,
      functionName: "setReferralBps",
      args: [bps],
    });
  }

  return { address, catalog, refresh, syncPlan, setAsset, setPrice, setReferralBps };
}
