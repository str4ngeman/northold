import {
  createPublicClient,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  type Abi,
  type Address,
  type Chain,
} from "viem";

import { anvilPid, loadArtifact, readDeployment, type Deployment } from "@/lib/lab/paths";
import { deploymentFromRuntime, getRuntimeNetwork } from "@/lib/network-store";
import { viemChain, type NetworkId } from "@/lib/networks";

function client(rpc: string, networkId: NetworkId) {
  const chain = { ...viemChain(networkId), rpcUrls: { default: { http: [rpc] } } } as Chain;
  return createPublicClient({ chain, transport: http(rpc) });
}

function usd8(n: bigint) {
  return Number(n) / 1e8;
}

function slugFromBytes32(hex: string) {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  const buf = Buffer.from(raw, "hex");
  const i = buf.indexOf(0);
  return buf.subarray(0, i === -1 ? buf.length : i).toString("utf8");
}

function assetMeta(d: Deployment, addr: string) {
  const a = addr.toLowerCase();
  if (a === d.contracts.usdt.toLowerCase()) return { symbol: "USDT", decimals: 6 };
  if (a === d.contracts.usdc.toLowerCase()) return { symbol: "USDC", decimals: 6 };
  if (a === d.contracts.weth.toLowerCase()) return { symbol: "WETH", decimals: 18 };
  if (a === d.contracts.wbtc.toLowerCase()) return { symbol: "WBTC", decimals: 8 };
  return { symbol: addr.slice(0, 8), decimals: 18 };
}

export async function getLabState() {
  const runtime = await getRuntimeNetwork();
  const anvil = anvilPid();
  const state: {
    anvil: { running: boolean; pid: number | null };
    network: {
      id: NetworkId;
      name: string;
      shortLabel: string;
      mode: "lab" | "test" | "live";
      chainId: number;
      explorerUrl: string;
      capabilities: { warp: boolean; faucet: boolean; deployMocks: boolean };
    };
    rpc: string;
    connected: boolean;
    chainId?: number;
    block?: string;
    time?: { unix: number; iso: string };
    deployment: Deployment | null;
  } = {
    anvil,
    network: {
      id: runtime.id,
      name: runtime.name,
      shortLabel: runtime.shortLabel,
      mode: runtime.mode,
      chainId: runtime.chainId,
      explorerUrl: runtime.explorerUrl,
      capabilities: runtime.capabilities,
    },
    rpc: runtime.rpcUrl,
    connected: false,
    deployment: readDeployment(runtime.chainId) ?? deploymentFromRuntime(runtime),
  };

  try {
    const pc = client(runtime.rpcUrl, runtime.id);
    const [chainId, blockNumber, block] = await Promise.all([
      pc.getChainId(),
      pc.getBlockNumber(),
      pc.getBlock({ blockTag: "latest" }),
    ]);
    state.connected = true;
    state.chainId = chainId;
    state.block = blockNumber.toString();
    const unix = Number(block.timestamp);
    state.time = { unix, iso: new Date(unix * 1000).toISOString() };
    if (chainId === runtime.chainId) {
      state.deployment = readDeployment(chainId) ?? deploymentFromRuntime(runtime);
    }
  } catch {
    state.connected = false;
  }
  return state;
}

export async function getCatalog() {
  const state = await getLabState();
  if (!state.connected || !state.deployment) {
    return { ok: false as const, error: "Connect the active network RPC and deploy first.", state };
  }
  const d = state.deployment;
  const pc = client(d.rpc || state.rpc, state.network.id);
  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;
  const oracleAbi = loadArtifact("LeagueOracle").abi as Abi;
  const count = (await pc.readContract({
    address: d.contracts.vault,
    abi: vaultAbi,
    functionName: "planCount",
  })) as bigint;

  const plans = [];
  for (let i = 1n; i <= count; i++) {
    const plan = (await pc.readContract({
      address: d.contracts.vault,
      abi: vaultAbi,
      functionName: "plans",
      args: [i],
    })) as {
      slug: `0x${string}`;
      lockSeconds: number;
      minUsd8: bigint;
      maxUsd8: bigint;
      apyBps: number;
      emergencyFeeBps: number;
      active: boolean;
    };
    plans.push({
      id: Number(i),
      slug: slugFromBytes32(plan.slug),
      lockDays: plan.lockSeconds / 86400,
      apyBps: plan.apyBps,
      emergencyFeeBps: plan.emergencyFeeBps,
      minUsd: usd8(plan.minUsd8),
      maxUsd: usd8(plan.maxUsd8),
      active: plan.active,
    });
  }

  const assets = await Promise.all(
    (
      [
        ["USDT", d.contracts.usdt],
        ["USDC", d.contracts.usdc],
        ["WETH", d.contracts.weth],
        ["WBTC", d.contracts.wbtc],
      ] as const
    ).map(async ([symbol, address]) => {
      const price = (await pc.readContract({
        address: d.contracts.oracle,
        abi: oracleAbi,
        functionName: "priceUsd",
        args: [address],
      })) as bigint;
      return { symbol, address, priceUsd: usd8(price) };
    }),
  );

  return { ok: true as const, state, plans, assets };
}

export async function getSnapshot() {
  const state = await getLabState();
  if (!state.connected || !state.deployment) {
    return { ok: false as const, error: "Connect the active network RPC and deploy first.", state };
  }
  const d = state.deployment;
  const pc = client(d.rpc || state.rpc, state.network.id);
  const lensAbi = loadArtifact("LeagueLens").abi as Abi;
  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;
  const snap = (await pc.readContract({
    address: d.contracts.lens,
    abi: lensAbi,
    functionName: "snapshot",
  })) as {
    nextTokenId: bigint;
    planCount: bigint;
    rewardBalance: bigint;
    rewardDecimals: number;
    referralBps: number;
    depositsPaused: boolean;
    exitsPaused: boolean;
  };
  const tokens = [d.contracts.usdt, d.contracts.usdc, d.contracts.weth, d.contracts.wbtc];
  const tvl = (await pc.readContract({
    address: d.contracts.lens,
    abi: lensAbi,
    functionName: "tvlUsd8",
    args: [tokens],
  })) as [bigint, bigint[]];
  const locked = await Promise.all(
    tokens.map(async (token, i) => {
      const amount = (await pc.readContract({
        address: d.contracts.vault,
        abi: vaultAbi,
        functionName: "lockedPrincipal",
        args: [token],
      })) as bigint;
      const meta = assetMeta(d, token);
      return {
        symbol: meta.symbol,
        address: token,
        amount: formatUnits(amount, meta.decimals),
        usd: usd8(tvl[1][i] ?? 0n),
      };
    }),
  );

  return {
    ok: true as const,
    state,
    snapshot: {
      cardsMinted: Math.max(0, Number(snap.nextTokenId) - 1),
      planCount: Number(snap.planCount),
      rewardBalance: formatUnits(snap.rewardBalance, snap.rewardDecimals),
      tvlUsd: usd8(tvl[0]),
      referralBps: snap.referralBps,
      depositsPaused: snap.depositsPaused,
      exitsPaused: snap.exitsPaused,
      locked,
      contracts: d.contracts,
    },
  };
}

type PositionView = {
  tokenId: bigint;
  owner: Address;
  asset: Address;
  principal: bigint;
  principalUsd8: bigint;
  planId: bigint;
  planSlug: `0x${string}`;
  startedAt: bigint;
  unlockAt: bigint;
  unlockedAt: bigint;
  accruedReward: bigint;
  claimedReward: bigint;
  claimableReward: bigint;
  lockSeconds: number;
  apyBps: number;
  emergencyFeeBps: number;
  rarity: number;
  sizeTier: number;
  status: number;
  lockProgressBps: bigint;
  matured: boolean;
};

const RARITY = ["common", "rare", "epic", "legendary"];
const TIER = ["spark", "vault", "sovereign"];
const STATUS = ["locked", "unlocked", "emergencyExited"];

export async function getWallet(address: Address) {
  const state = await getLabState();
  if (!state.connected || !state.deployment) {
    return { ok: false as const, error: "Connect the active network RPC and deploy first.", state };
  }
  const d = state.deployment;
  const pc = client(d.rpc || state.rpc, state.network.id);
  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;
  const lensAbi = loadArtifact("LeagueLens").abi as Abi;

  const eth = await pc.getBalance({ address });
  const tokens = await Promise.all(
    (
      [
        ["USDT", d.contracts.usdt, 6],
        ["USDC", d.contracts.usdc, 6],
        ["WETH", d.contracts.weth, 18],
        ["WBTC", d.contracts.wbtc, 8],
      ] as const
    ).map(async ([symbol, tokenAddr, decimals]) => {
      const [balance, allowance] = await Promise.all([
        pc.readContract({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }) as Promise<bigint>,
        pc.readContract({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, d.contracts.vault],
        }) as Promise<bigint>,
      ]);
      return {
        symbol,
        address: tokenAddr,
        balance: formatUnits(balance, decimals),
        allowance: allowance === 0n ? "0" : allowance === 2n ** 256n - 1n ? "max" : formatUnits(allowance, decimals),
      };
    }),
  );

  const referrer = (await pc.readContract({
    address: d.contracts.vault,
    abi: vaultAbi,
    functionName: "referrerOf",
    args: [address],
  })) as Address;

  const list = (await pc.readContract({
    address: d.contracts.lens,
    abi: lensAbi,
    functionName: "positionsOf",
    args: [address],
  })) as PositionView[];

  const positions = list.map((p) => {
    const asset = assetMeta(d, p.asset);
    return {
      tokenId: Number(p.tokenId),
      plan: slugFromBytes32(p.planSlug),
      asset: asset.symbol,
      principal: formatUnits(p.principal, asset.decimals),
      principalUsd: usd8(p.principalUsd8),
      accrued: formatUnits(p.accruedReward, 6),
      claimed: formatUnits(p.claimedReward, 6),
      claimable: formatUnits(p.claimableReward, 6),
      progressBps: Number(p.lockProgressBps),
      status: STATUS[p.status] ?? String(p.status),
      rarity: RARITY[p.rarity] ?? String(p.rarity),
      sizeTier: TIER[p.sizeTier] ?? String(p.sizeTier),
      startedAt: Number(p.startedAt),
      unlockAt: Number(p.unlockAt),
      matured: p.matured,
      apyBps: p.apyBps,
    };
  });

  const claimableTotal = positions.reduce((s, p) => s + Number(p.claimable), 0);

  return {
    ok: true as const,
    state,
    wallet: {
      address,
      eth: formatEther(eth),
      referrer: referrer === "0x0000000000000000000000000000000000000000" ? null : referrer,
      tokens,
      positions,
      claimableTotal,
    },
  };
}

export async function getRecentEvents(limit = 40) {
  const state = await getLabState();
  if (!state.connected || !state.deployment) {
    return { ok: false as const, error: "Connect the active network RPC and deploy first.", events: [], explorerUrl: "" };
  }
  const d = state.deployment;
  const pc = client(d.rpc || state.rpc, state.network.id);
  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;
  const latest = await pc.getBlockNumber();
  const fromBlock = latest > 2000n ? latest - 2000n : 0n;
  const logs = await pc.getContractEvents({
    address: d.contracts.vault,
    abi: vaultAbi,
    fromBlock,
    toBlock: latest,
  });
  const sliced = logs.slice(-limit).reverse();
  return {
    ok: true as const,
    latest: latest.toString(),
    explorerUrl: state.network.explorerUrl,
    events: sliced.map((log) => ({
      event: log.eventName,
      block: log.blockNumber?.toString() ?? "",
      tx: log.transactionHash,
      args: serializeArgs(log.args as Record<string, unknown>),
    })),
  };
}

function serializeArgs(args: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) {
    if (k === "__length" || /^\d+$/.test(k)) continue;
    out[k] = typeof v === "bigint" ? v.toString() : String(v);
  }
  return out;
}
