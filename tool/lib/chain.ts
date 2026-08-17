import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry as foundryChain, mainnet, sepolia } from "viem/chains";

import { ANVIL_PK } from "./env";

export function rpcUrl(cli?: string) {
  return cli || process.env.RPC_URL || "http://127.0.0.1:8545";
}

export function privateKey(cli?: string): Hex {
  const raw = cli || process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || ANVIL_PK;
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

export function chainFor(url: string, chainId?: number): Chain {
  if (chainId === 1) return { ...mainnet, rpcUrls: { default: { http: [url] } } };
  if (chainId === 11155111) return { ...sepolia, rpcUrls: { default: { http: [url] } } };
  if (url.includes("127.0.0.1") || url.includes("localhost") || chainId === 31337) {
    return foundryChain;
  }
  return {
    ...foundryChain,
    id: chainId ?? 31337,
    rpcUrls: { default: { http: [url] } },
  };
}

export async function clients(opts: { rpc?: string; pk?: string }) {
  const url = rpcUrl(opts.rpc);
  const account = privateKeyToAccount(privateKey(opts.pk));
  const probe = createPublicClient({ transport: http(url) });
  const chainId = await probe.getChainId();
  const chain = chainFor(url, chainId);
  const publicClient = createPublicClient({ chain, transport: http(url) });
  const wallet = createWalletClient({ chain, transport: http(url), account });
  return { url, chainId, chain, publicClient, wallet, account };
}

export async function getTime(publicClient: PublicClient) {
  const block = await publicClient.getBlock({ blockTag: "latest" });
  return Number(block.timestamp);
}

export async function increaseTime(publicClient: PublicClient, seconds: number) {
  await publicClient.request({
    method: "evm_increaseTime" as never,
    params: [seconds] as never,
  });
  await publicClient.request({ method: "evm_mine" as never, params: [] as never });
}

export async function setTime(publicClient: PublicClient, timestamp: number) {
  await publicClient.request({
    method: "evm_setNextBlockTimestamp" as never,
    params: [timestamp] as never,
  });
  await publicClient.request({ method: "evm_mine" as never, params: [] as never });
}

export function parseDuration(input: string): number {
  const m = /^(\d+(?:\.\d+)?)(s|m|h|d|w|y)?$/i.exec(input.trim());
  if (!m) throw new Error(`Bad duration '${input}'. Use 30d, 12h, 90d, 3600`);
  const n = Number(m[1]);
  const u = (m[2] || "s").toLowerCase();
  const mul: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 7 * 86400,
    y: 31_557_600,
  };
  return Math.round(n * mul[u]);
}

export function fmtTs(ts: number) {
  return new Date(ts * 1000).toISOString();
}

export type Wallet = { account: Account };
