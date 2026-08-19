import { createPublicClient, erc20Abi, formatEther, formatUnits, http, isAddress, type Abi, type Address, type Chain } from "viem";

import { connectDb } from "@/lib/db";
import { loadArtifact, readDeployment, type Deployment } from "@/lib/lab/paths";
import { Token } from "@/lib/models/token";
import { deploymentFromRuntime, getRuntimeNetwork } from "@/lib/network-store";
import { viemChain, type NetworkId, type NetworkTokenMap } from "@/lib/networks";

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

export type LabAsset = {
  slug: string;
  symbol: string;
  address: Address;
  decimals: number;
};

function listedAssets(tokens: NetworkTokenMap, d?: Deployment | null): LabAsset[] {
  const fromMap = Object.entries(tokens)
    .filter((entry): entry is [string, { address: Address; decimals: number }] => Boolean(entry[1]?.address))
    .map(([slug, meta]) => ({
      slug,
      symbol: slug.toUpperCase(),
      address: meta.address,
      decimals: meta.decimals,
    }));
  if (fromMap.length) return fromMap;
  if (!d) return [];
  const fallback: LabAsset[] = [];
  const push = (slug: string, address: Address | undefined, decimals: number) => {
    if (address) fallback.push({ slug, symbol: slug.toUpperCase(), address, decimals });
  };
  push("usdt", d.contracts.usdt, 6);
  push("usdc", d.contracts.usdc, 6);
  push("weth", d.contracts.weth, 18);
  push("wbtc", d.contracts.wbtc, 8);
  return fallback;
}

function assetMeta(assets: LabAsset[], addr: string) {
  const hit = assets.find((a) => a.address.toLowerCase() === addr.toLowerCase());
  return hit ?? { slug: addr.slice(0, 8), symbol: addr.slice(0, 8), address: addr as Address, decimals: 18 };
}

async function catalogTokenMap(): Promise<NetworkTokenMap> {
  await connectDb();
  const docs = await Token.find().sort({ symbol: 1 });
  const map: NetworkTokenMap = {};
  for (const t of docs) {
    if (t.active === false) continue;
    if (!isAddress(t.address) || t.address === "0x0000000000000000000000000000000000000000") continue;
    map[t.slug] = { address: t.address as Address, decimals: t.decimals };
  }
  return map;
}

export async function getLabState() {
  const runtime = await getRuntimeNetwork();
  const catalog = await catalogTokenMap();
  const tokenMap = { ...catalog, ...runtime.tokens };
  const state: {
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
    assets: LabAsset[];
  } = {
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
    assets: [],
  };
  state.assets = listedAssets(tokenMap, state.deployment);

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
      state.assets = listedAssets(tokenMap, state.deployment);
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
  const vaultAbi = loadArtifact("NortholdVault").abi as Abi;
  const oracleAbi = loadArtifact("NortholdOracle").abi as Abi;
  const count = (await pc.readContract({
    address: d.contracts.vault,
    abi: vaultAbi,
    functionName: "planCount",
  })) as bigint;

  const plans = [];
  for (let i = BigInt(1); i <= count; i++) {
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

  const listed = state.assets;
  const assets = await Promise.all(
    listed.map(async (a) => {
      const price = (await pc.readContract({
        address: d.contracts.oracle,
        abi: oracleAbi,
        functionName: "priceUsd",
        args: [a.address],
      })) as bigint;
      return { symbol: a.symbol, address: a.address, priceUsd: usd8(price), decimals: a.decimals, slug: a.slug };
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
  const lensAbi = loadArtifact("NortholdLens").abi as Abi;
  const vaultAbi = loadArtifact("NortholdVault").abi as Abi;
  const snap = (await pc.readContract({
    address: d.contracts.lens,
    abi: lensAbi,
    functionName: "snapshot",
  })) as {
    nextTokenId: bigint;
    planCount: bigint;
    referralBps: number;
    depositsPaused: boolean;
    exitsPaused: boolean;
  };
  const assets = state.assets;
  const tokens = assets.map((a) => a.address);
  const tvl = tokens.length
    ? ((await pc.readContract({
        address: d.contracts.lens,
        abi: lensAbi,
        functionName: "tvlUsd8",
        args: [tokens],
      })) as [bigint, bigint[]])
    : ([BigInt(0), []] as [bigint, bigint[]]);
  const locked = await Promise.all(
    tokens.map(async (token, i) => {
      const amount = (await pc.readContract({
        address: d.contracts.vault,
        abi: vaultAbi,
        functionName: "lockedPrincipal",
        args: [token],
      })) as bigint;
      const meta = assetMeta(assets, token);
      return {
        symbol: meta.symbol,
        address: token,
        amount: formatUnits(amount, meta.decimals),
        usd: usd8(tvl[1][i] ?? BigInt(0)),
      };
    }),
  );

  const surplus = await Promise.all(
    tokens.map(async (token) => {
      const amount = (await pc.readContract({
        address: d.contracts.vault,
        abi: vaultAbi,
        functionName: "available",
        args: [token],
      })) as bigint;
      const meta = assetMeta(assets, token);
      return {
        symbol: meta.symbol,
        amount: formatUnits(amount, meta.decimals),
      };
    }),
  );

  return {
    ok: true as const,
    state,
    snapshot: {
      cardsMinted: Math.max(0, Number(snap.nextTokenId) - 1),
      planCount: Number(snap.planCount),
      treasury: surplus,
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
  const vaultAbi = loadArtifact("NortholdVault").abi as Abi;
  const lensAbi = loadArtifact("NortholdLens").abi as Abi;

  const eth = await pc.getBalance({ address });
  const tokens = await Promise.all(
    state.assets.map(async (a) => {
      const [balance, allowance] = await Promise.all([
        pc.readContract({
          address: a.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }) as Promise<bigint>,
        pc.readContract({
          address: a.address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, d.contracts.vault],
        }) as Promise<bigint>,
      ]);
      return {
        symbol: a.symbol,
        address: a.address,
        balance: formatUnits(balance, a.decimals),
        allowance: allowance === BigInt(0) ? "0" : allowance === (BigInt(2) ** BigInt(256)) - BigInt(1) ? "max" : formatUnits(allowance, a.decimals),
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
    const asset = assetMeta(state.assets, p.asset);
    return {
      tokenId: Number(p.tokenId),
      plan: slugFromBytes32(p.planSlug),
      asset: asset.symbol,
      principal: formatUnits(p.principal, asset.decimals),
      principalUsd: usd8(p.principalUsd8),
      accrued: formatUnits(p.accruedReward, asset.decimals),
      claimed: formatUnits(p.claimedReward, asset.decimals),
      claimable: formatUnits(p.claimableReward, asset.decimals),
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
  const vaultAbi = loadArtifact("NortholdVault").abi as Abi;
  const latest = await pc.getBlockNumber();
  const fromBlock = latest > BigInt(2000) ? latest - BigInt(2000) : BigInt(0);
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
