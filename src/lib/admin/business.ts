import {
  createPublicClient,
  formatUnits,
  http,
  type Abi,
  type Address,
} from "viem";

import { loadLiveProtocol, type LiveProtocol } from "@/lib/lab/chain-write";
import { loadArtifact, readDeployment } from "@/lib/lab/paths";
import { mapPlan, mapToken } from "@/lib/map-catalog";
import { mapPosition } from "@/lib/map-position";
import { buildPositionView, projectedUsdt } from "@/lib/math";
import { Thread } from "@/lib/models/chat";
import { Plan } from "@/lib/models/plan";
import { Position } from "@/lib/models/position";
import { Token } from "@/lib/models/token";
import { User } from "@/lib/models/user";
import { viemChain } from "@/lib/networks";
import { slugFromBytes32 } from "@/lib/protocol-abi";

const STATUS = ["locked", "unlocked", "emergencyExited"] as const;
const RARITY = ["common", "rare", "epic", "legendary"] as const;
const TIER = ["spark", "vault", "sovereign"] as const;

export type MoneyRow = { label: string; usd: number; amount?: string; symbol?: string };

export type BusinessReport = {
  source: "chain" | "mongo";
  asOf: string;
  headline: {
    investedUsd: number;
    lockedUsd: number;
    couponPaidUsdt: number;
    claimableUsdt: number;
    accruedUsdt: number;
    treasuryUsdt: number;
    coverage: number | null;
  };
  book: {
    cards: number;
    locked: number;
    maturedOpen: number;
    unlocked: number;
    emergency: number;
    uniqueOwners: number;
    forfeitedUsdt: number;
    remainingCouponUsdt: number;
    referralPaidUsdt: number;
  };
  assets: MoneyRow[];
  plans: {
    slug: string;
    name: string;
    cards: number;
    lockedUsd: number;
    claimableUsdt: number;
    apyBps: number;
  }[];
  mix: {
    rarity: { label: string; count: number }[];
    size: { label: string; count: number }[];
  };
  cash: {
    rewardsFundedUsdt: number;
    couponPaidUsdt: number;
    referralPaidUsdt: number;
    principalReturnedUsd: number;
    emergencyFeesUsd: number;
  };
  treasury: {
    usdt: number;
    fees: { symbol: string; amount: string; usd: number }[];
    depositsPaused: boolean;
    exitsPaused: boolean;
    referralBps: number;
  };
  people: {
    users: number;
    wallets: number;
    admins: number;
    banned: number;
    referred: number;
    openSupport: number;
  };
  activity: { event: string; detail: string; tokenId?: number }[];
  note?: string;
};

function usd8(n: bigint) {
  return Number(n) / 1e8;
}

function usdt(n: bigint) {
  return Number(formatUnits(n, 6));
}

async function people() {
  const [users, wallets, admins, banned, referred, openSupport] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ address: { $exists: true, $nin: [null, ""] } }),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ banned: true }),
    User.countDocuments({ referredBy: { $ne: null } }),
    Thread.countDocuments({ status: "open" }),
  ]);
  return { users, wallets, admins, banned, referred, openSupport };
}

export async function loadBusinessReport(): Promise<BusinessReport> {
  const protocol = await loadLiveProtocol();
  if (protocol?.lens) {
    try {
      return await fromChain(protocol);
    } catch (err) {
      const fallback = await fromMongo();
      fallback.note = `Vault is configured but the chain read failed (${err instanceof Error ? err.message : "unknown"}). Showing the Mongo book.`;
      return fallback;
    }
  }
  return fromMongo();
}

async function fromMongo(): Promise<BusinessReport> {
  const [positions, planDocs, tokenDocs, folks] = await Promise.all([
    Position.find().sort({ tokenId: -1 }).limit(2000),
    Plan.find(),
    Token.find(),
    people(),
  ]);
  const now = Date.now();
  const plans = planDocs.map(mapPlan);
  const tokens = tokenDocs.map(mapToken);
  const views = positions.flatMap((row) => {
    const token = tokens.find((t) => t.id === row.assetId);
    const plan = plans.find((p) => p.id === row.planId);
    if (!token || !plan) return [];
    return [buildPositionView(mapPosition(row), token, plan, now)];
  });

  const locked = views.filter((v) => v.status === "locked");
  const emergency = views.filter((v) => v.status === "emergencyExited");
  const unlocked = views.filter((v) => v.status === "unlocked");
  const investedUsd = views.reduce((s, v) => s + v.principalUsd, 0);
  const lockedUsd = locked.reduce((s, v) => s + v.principalUsd, 0);
  const accrued = views.reduce((s, v) => s + v.accruedUsdt, 0);
  const claimed = views.reduce((s, v) => s + v.claimedUsdt, 0);
  const claimable = views.reduce((s, v) => s + v.claimableUsdt, 0);
  const forfeited = emergency.reduce((s, v) => s + Math.max(0, v.accruedUsdt - v.claimedUsdt), 0);
  const remaining = locked.reduce(
    (s, v) => s + Math.max(0, projectedUsdt(v.principalUsd, v.plan.apyBps, v.plan.lockSeconds) - v.accruedUsdt),
    0,
  );

  const assetMap = new Map<string, MoneyRow>();
  for (const v of locked) {
    const cur = assetMap.get(v.token.id) ?? { label: v.token.symbol, usd: 0, symbol: v.token.symbol };
    cur.usd += v.principalUsd;
    assetMap.set(v.token.id, cur);
  }

  const planRows = plans.map((plan) => {
    const set = views.filter((v) => v.planId === plan.id);
    return {
      slug: plan.id,
      name: plan.name,
      cards: set.length,
      lockedUsd: set.filter((v) => v.status === "locked").reduce((s, v) => s + v.principalUsd, 0),
      claimableUsdt: set.reduce((s, v) => s + v.claimableUsdt, 0),
      apyBps: plan.apyBps,
    };
  });

  return {
    source: "mongo",
    asOf: new Date(now).toISOString(),
    headline: {
      investedUsd,
      lockedUsd,
      couponPaidUsdt: claimed,
      claimableUsdt: claimable,
      accruedUsdt: accrued,
      treasuryUsdt: 0,
      coverage: null,
    },
    book: {
      cards: views.length,
      locked: locked.length,
      maturedOpen: locked.filter((v) => v.isMatured).length,
      unlocked: unlocked.length,
      emergency: emergency.length,
      uniqueOwners: new Set(views.map((v) => v.owner.toLowerCase())).size,
      forfeitedUsdt: forfeited,
      remainingCouponUsdt: remaining,
      referralPaidUsdt: 0,
    },
    assets: [...assetMap.values()].sort((a, b) => b.usd - a.usd),
    plans: planRows.filter((p) => p.cards > 0),
    mix: {
      rarity: RARITY.map((label) => ({ label, count: views.filter((v) => v.rarity === label).length })),
      size: TIER.map((label) => ({ label, count: views.filter((v) => v.sizeTier === label).length })),
    },
    cash: {
      rewardsFundedUsdt: 0,
      couponPaidUsdt: claimed,
      referralPaidUsdt: 0,
      principalReturnedUsd: unlocked.reduce((s, v) => s + v.principalUsd, 0),
      emergencyFeesUsd: 0,
    },
    treasury: {
      usdt: 0,
      fees: [],
      depositsPaused: false,
      exitsPaused: false,
      referralBps: 500,
    },
    people: folks,
    activity: [],
    note: "Vault is not deployed. These numbers are the off-chain catalog book.",
  };
}

async function fromChain(protocol: LiveProtocol): Promise<BusinessReport> {
  const file = readDeployment(protocol.chainId);
  const lens = (protocol.lens || file?.contracts.lens) as Address | undefined;
  if (!lens) throw new Error("Lens address missing");
  const vault = protocol.vault;
  const chain = {
    ...viemChain(protocol.networkId),
    rpcUrls: { default: { http: [protocol.rpcUrl] } },
  };
  const pc = createPublicClient({ chain, transport: http(protocol.rpcUrl) });
  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;
  const lensAbi = loadArtifact("LeagueLens").abi as Abi;
  const oracleAbi = loadArtifact("LeagueOracle").abi as Abi;
  const tokens: { symbol: string; address: Address; decimals: number }[] = [
    { symbol: "USDT", address: (protocol.usdt ?? file?.contracts.usdt) as Address, decimals: 6 },
    { symbol: "USDC", address: (protocol.usdc ?? file?.contracts.usdc) as Address, decimals: 6 },
    { symbol: "WETH", address: (protocol.weth ?? file?.contracts.weth) as Address, decimals: 18 },
    { symbol: "WBTC", address: (protocol.wbtc ?? file?.contracts.wbtc) as Address, decimals: 8 },
  ].filter((t) => Boolean(t.address));

  const [snap, tvl, folks, planDocs] = await Promise.all([
    pc.readContract({
      address: lens,
      abi: lensAbi,
      functionName: "snapshot",
    }) as Promise<{
      nextTokenId: bigint;
      rewardBalance: bigint;
      rewardDecimals: number;
      referralBps: number;
      depositsPaused: boolean;
      exitsPaused: boolean;
    }>,
    pc.readContract({
      address: lens,
      abi: lensAbi,
      functionName: "tvlUsd8",
      args: [tokens.map((t) => t.address)],
    }) as Promise<readonly [bigint, bigint[]]>,
    people(),
    Plan.find(),
  ]);

  const nextId = Number(snap.nextTokenId);
  const ids = Array.from({ length: Math.max(0, Math.min(nextId - 1, 2000)) }, (_, i) => i + 1);
  const viewsRaw = ids.length
    ? await pc.multicall({
        allowFailure: true,
        contracts: ids.map((id) => ({
          address: lens,
          abi: lensAbi,
          functionName: "positionView",
          args: [BigInt(id)],
        })),
      })
    : [];

  type Row = {
    tokenId: number;
    owner: Address;
    principalUsd: number;
    planSlug: string;
    apyBps: number;
    lockSeconds: number;
    accrued: number;
    claimed: number;
    claimable: number;
    status: (typeof STATUS)[number];
    rarity: (typeof RARITY)[number];
    sizeTier: (typeof TIER)[number];
    matured: boolean;
  };

  const rows: Row[] = [];
  for (const item of viewsRaw) {
    if (item.status !== "success" || !item.result) continue;
    const p = item.result as {
      tokenId: bigint;
      owner: Address;
      principalUsd8: bigint;
      planSlug: `0x${string}`;
      lockSeconds: number;
      apyBps: number;
      accruedReward: bigint;
      claimedReward: bigint;
      claimableReward: bigint;
      rarity: number;
      sizeTier: number;
      status: number;
      matured: boolean;
      startedAt: bigint;
    };
    if (!p.startedAt) continue;
    rows.push({
      tokenId: Number(p.tokenId),
      owner: p.owner,
      principalUsd: usd8(p.principalUsd8),
      planSlug: slugFromBytes32(p.planSlug),
      apyBps: p.apyBps,
      lockSeconds: p.lockSeconds,
      accrued: usdt(p.accruedReward),
      claimed: usdt(p.claimedReward),
      claimable: usdt(p.claimableReward),
      status: STATUS[p.status] ?? "locked",
      rarity: RARITY[p.rarity] ?? "common",
      sizeTier: TIER[p.sizeTier] ?? "spark",
      matured: p.matured,
    });
  }

  const locked = rows.filter((r) => r.status === "locked");
  const unlocked = rows.filter((r) => r.status === "unlocked");
  const emergency = rows.filter((r) => r.status === "emergencyExited");
  const investedUsd = rows.reduce((s, r) => s + r.principalUsd, 0);
  const lockedUsd = usd8(tvl[0]);
  const accrued = rows.reduce((s, r) => s + r.accrued, 0);
  const claimed = rows.reduce((s, r) => s + r.claimed, 0);
  const claimable = rows.reduce((s, r) => s + r.claimable, 0);
  const treasuryUsdt = Number(formatUnits(snap.rewardBalance, snap.rewardDecimals));
  const forfeited = emergency.reduce((s, r) => s + Math.max(0, r.accrued - r.claimed), 0);
  const remaining = locked.reduce((s, r) => {
    const cap = projectedUsdt(r.principalUsd, r.apyBps, r.lockSeconds);
    return s + Math.max(0, cap - r.accrued);
  }, 0);

  const assets: MoneyRow[] = tokens.map((t, i) => ({
    label: t.symbol,
    usd: usd8(tvl[1][i] ?? BigInt(0)),
    symbol: t.symbol,
  }));

  const fees = await Promise.all(
    tokens.map(async (t) => {
      const [amount, price] = await Promise.all([
        pc.readContract({
          address: vault,
          abi: vaultAbi,
          functionName: "protocolFees",
          args: [t.address],
        }) as Promise<bigint>,
        pc.readContract({
          address: protocol.oracle,
          abi: oracleAbi,
          functionName: "priceUsd",
          args: [t.address],
        }) as Promise<bigint>,
      ]);
      const qty = Number(formatUnits(amount, t.decimals));
      return { symbol: t.symbol, amount: formatUnits(amount, t.decimals), usd: qty * usd8(price) };
    }),
  );

  const planName = new Map(planDocs.map((p) => [p.slug as string, p.name as string]));
  const planRows = [...new Set(rows.map((r) => r.planSlug))].map((slug) => {
    const set = rows.filter((r) => r.planSlug === slug);
    return {
      slug,
      name: planName.get(slug) ?? slug,
      cards: set.length,
      lockedUsd: set.filter((r) => r.status === "locked").reduce((s, r) => s + r.principalUsd, 0),
      claimableUsdt: set.reduce((s, r) => s + r.claimable, 0),
      apyBps: set[0]?.apyBps ?? 0,
    };
  });

  const cash = {
    rewardsFundedUsdt: 0,
    couponPaidUsdt: 0,
    referralPaidUsdt: 0,
    principalReturnedUsd: unlocked.reduce((s, r) => s + r.principalUsd, 0),
    emergencyFeesUsd: fees.reduce((s, f) => s + f.usd, 0),
  };
  const activity: BusinessReport["activity"] = [];
  try {
    const logs = await pc.getContractEvents({
      address: vault,
      abi: vaultAbi,
      fromBlock: BigInt(0),
      toBlock: "latest",
    });
    for (const log of logs) {
      const args = (log.args ?? {}) as Record<string, unknown>;
      const tokenId = args.tokenId != null ? Number(args.tokenId as bigint) : undefined;
      if (log.eventName === "Claimed") {
        cash.couponPaidUsdt += usdt((args.paid as bigint) ?? BigInt(0));
        cash.referralPaidUsdt += usdt((args.referralPaid as bigint) ?? BigInt(0));
        activity.push({ event: "Claim", tokenId, detail: `${usdt((args.paid as bigint) ?? BigInt(0)).toFixed(2)} USDT paid` });
      } else if (log.eventName === "Unlocked") {
        cash.couponPaidUsdt += usdt((args.rewardPaid as bigint) ?? BigInt(0));
        activity.push({ event: "Unlock", tokenId, detail: "Principal returned" });
      } else if (log.eventName === "EmergencyExited") {
        activity.push({ event: "Early exit", tokenId, detail: "Fee taken, unclaimed coupon forfeited" });
      } else if (log.eventName === "Minted") {
        activity.push({
          event: "Mint",
          tokenId,
          detail: `${usd8((args.principalUsd8 as bigint) ?? BigInt(0)).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} locked`,
        });
      } else if (log.eventName === "RewardsFunded") {
        cash.rewardsFundedUsdt += usdt((args.amount as bigint) ?? BigInt(0));
        activity.push({ event: "Treasury in", detail: `+${usdt((args.amount as bigint) ?? BigInt(0)).toFixed(0)} USDT` });
      }
    }
  } catch {
    cash.couponPaidUsdt = claimed;
  }
  if (!cash.couponPaidUsdt) cash.couponPaidUsdt = claimed;

  return {
    source: "chain",
    asOf: new Date().toISOString(),
    headline: {
      investedUsd,
      lockedUsd,
      couponPaidUsdt: cash.couponPaidUsdt,
      claimableUsdt: claimable,
      accruedUsdt: accrued,
      treasuryUsdt,
      coverage: claimable > 0.0001 ? treasuryUsdt / claimable : null,
    },
    book: {
      cards: rows.length,
      locked: locked.length,
      maturedOpen: locked.filter((r) => r.matured).length,
      unlocked: unlocked.length,
      emergency: emergency.length,
      uniqueOwners: new Set(rows.map((r) => r.owner.toLowerCase())).size,
      forfeitedUsdt: forfeited,
      remainingCouponUsdt: remaining,
      referralPaidUsdt: cash.referralPaidUsdt,
    },
    assets,
    plans: planRows,
    mix: {
      rarity: RARITY.map((label) => ({ label, count: rows.filter((r) => r.rarity === label).length })),
      size: TIER.map((label) => ({ label, count: rows.filter((r) => r.sizeTier === label).length })),
    },
    cash,
    treasury: {
      usdt: treasuryUsdt,
      fees: fees.filter((f) => Number(f.amount) > 0),
      depositsPaused: snap.depositsPaused,
      exitsPaused: snap.exitsPaused,
      referralBps: snap.referralBps,
    },
    people: folks,
    activity: activity.slice(-14).reverse(),
  };
}
