"use client";

import { type Address, parseEther, parseUnits } from "viem";
import { useAccount, useChainId, useConfig, useSwitchChain } from "wagmi";
import { sendTransaction, waitForTransactionReceipt, writeContract } from "wagmi/actions";

import { decodeChainError } from "@/lib/chain-error";
import { LAB_TOKEN_DECIMALS, walletAddChainParams } from "@/lib/networks";

const mintAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const TOKEN_SLUGS = ["usdt", "usdc", "weth", "wbtc"] as const;

export function useLabFund() {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  async function fund(input: {
    to: Address;
    eth: string;
    tokens: Partial<Record<(typeof TOKEN_SLUGS)[number], string>>;
  }) {
    if (!address) throw new Error("Connect the deployer MetaMask wallet");
    try {
      const res = await fetch("/api/lab/state");
      const state = (await res.json()) as {
        error?: string;
        rpc?: string;
        network?: { chainId: number };
        deployment?: { contracts?: Record<string, string> } | null;
      };
      if (!res.ok) throw new Error(state.error || "Could not load lab state");
      const contracts = state.deployment?.contracts;
      if (!contracts) throw new Error("Deploy the vault on Sepolia first");

      const target = state.network?.chainId ?? 11155111;
      if (chainId !== target) {
        try {
          await switchChainAsync({ chainId: target });
        } catch {
          const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
          if (!eth) throw new Error("MetaMask is not available");
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [walletAddChainParams("sepolia", state.rpc)],
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

      for (const slug of TOKEN_SLUGS) {
        const amount = input.tokens[slug];
        if (!amount || Number(amount) <= 0) continue;
        const token = contracts[slug] as Address | undefined;
        if (!token) throw new Error(`Missing ${slug.toUpperCase()} address`);
        const hash = await writeContract(config, {
          address: token,
          abi: mintAbi,
          functionName: "mint",
          args: [input.to, parseUnits(amount, LAB_TOKEN_DECIMALS[slug])],
        });
        await waitForTransactionReceipt(config, { hash });
        sent.push(`${amount} ${slug.toUpperCase()}`);
      }

      if (!sent.length) throw new Error("Nothing to send");
      return sent;
    } catch (err) {
      throw new Error(decodeChainError(err));
    }
  }

  return { address, isConnected, fund };
}
