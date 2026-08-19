"use client";

import { type Address, erc20Abi, parseEther, parseUnits } from "viem";
import { useAccount, useChainId, useConfig, useSwitchChain } from "wagmi";
import { sendTransaction, waitForTransactionReceipt, writeContract } from "wagmi/actions";

import { decodeChainError } from "@/lib/chain-error";
import { appNetworkId, NETWORKS, networkIdFromChainId, walletAddChainParams } from "@/lib/networks";

export type FundAsset = { slug: string; symbol: string; address: Address; decimals: number };

export function useLabFund() {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  async function fund(input: { to: Address; eth: string; tokens: Record<string, string>; assets: FundAsset[] }) {
    if (!address) throw new Error("Connect a wallet first");
    try {
      const res = await fetch("/api/lab/state");
      const state = (await res.json()) as {
        error?: string;
        rpc?: string;
        network?: { chainId: number };
      };
      if (!res.ok) throw new Error(state.error || "Could not load chain");

      const target = state.network?.chainId ?? NETWORKS[appNetworkId()].chainId;
      if (chainId !== target) {
        try {
          await switchChainAsync({ chainId: target });
        } catch {
          const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
          if (!eth) throw new Error("No browser wallet available");
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [walletAddChainParams(networkIdFromChainId(target), state.rpc)],
          });
          await switchChainAsync({ chainId: target });
        }
      }

      const sent: string[] = [];
      if (input.eth && Number(input.eth) > 0) {
        const hash = await sendTransaction(config, {
          to: input.to,
          value: parseEther(input.eth),
        });
        await waitForTransactionReceipt(config, { hash });
        sent.push(`${input.eth} ETH`);
      }

      for (const asset of input.assets) {
        const amount = input.tokens[asset.slug];
        if (!amount || Number(amount) <= 0) continue;
        const hash = await writeContract(config, {
          address: asset.address,
          abi: erc20Abi,
          functionName: "transfer",
          args: [input.to, parseUnits(amount, asset.decimals)],
        });
        await waitForTransactionReceipt(config, { hash });
        sent.push(`${amount} ${asset.symbol}`);
      }

      if (!sent.length) throw new Error("Nothing to send");
      return sent;
    } catch (err) {
      throw new Error(decodeChainError(err));
    }
  }

  return { address, isConnected, fund };
}
