import "server-only";

import { DISTRICTS, sitesIn, type DistrictId } from "@/lib/field/world";
import type { CategoryId, FieldPool, FieldSnapshot, TierKey } from "@/lib/field/types";

/**
 * The ground is real. Every site on the sheet is bound to a live pool from
 * DefiLlama's open yields index — no rate is invented here, and nothing is
 * promised. Districts are categories of yield, elevation is the rate, and
 * depth is risk read off the pool's own attributes.
 */

const SOURCE = "https://yields.llama.fi/pools";
const TTL_MS = 15 * 60 * 1000;
const MIN_TVL = 5_000_000;
const CHAINS = new Set([
  "Ethereum",
  "Arbitrum",
  "Base",
  "Optimism",
  "Polygon",
  "Avalanche",
  "BSC",
  "Solana",
]);

/** Project prefixes per category, most specific bucket first. */
const CATEGORY_MATCH: [CategoryId, string[]][] = [
  [
    "rwa",
    ["blackrock-", "midas-", "ondo-", "vaneck-", "centrifuge", "circle-usyc", "maple", "pareto-credit",
     "sky-lending", "spark-savings", "crvusd", "frax", "usual", "hastra", "apollo-", "securitize",
     "superstate", "openeden", "franklin", "frankencoin", "mountain", "agora", "level-money", "resolv", "falcon"],
  ],
  [
    "staking",
    ["lido", "rocket-pool", "binance-staked", "ether.fi-stake", "stakewise", "jito", "marinade",
     "origin-ether", "coinbase-wrapped", "mantle-staked", "meth-protocol", "frax-ether", "swell",
     "stader", "sanctum", "symbiotic", "eigenlayer", "renzo", "kelp", "puffer", "dinero", "treehouse",
     "liquid-collective", "lombard-", "jupiter-staked", "drift-staked", "lista-liquid"],
  ],
  [
    "fixed",
    ["pendle", "spectra", "notional", "termmax", "term-finance", "napier", "ipor", "ethena", "solv-",
     "zerobase", "upshift", "makina", "sentora", "concrete", "re", "hyperdrive", "usd-ai", "onre", "apyx-"],
  ],
  [
    "vaults",
    ["convex-finance", "yearn-finance", "beefy", "vesper", "ether.fi-liquid", "gearbox", "idle",
     "harvest", "aura", "stakedao", "summer.fi", "contango", "origin-", "stream", "tokemak", "reservoir"],
  ],
  [
    "lending",
    ["aave-v", "morpho-blue", "compound-v", "sparklend", "fluid-lending", "fluid-lite", "venus-",
     "kamino-lend", "jupiter-lend", "dolomite", "lista-lending", "curve-llamalend", "moonwell-lending",
     "euler-", "radiant", "benqi-lending", "save", "zerolend", "seamless"],
  ],
  [
    "dex",
    ["uniswap-v", "curve-dex", "balancer-v", "aerodrome", "velodrome", "raydium-", "orca-dex",
     "pancakeswap", "fluid-dex", "kamino-liquidity", "meteora", "sushiswap", "camelot",
     "shadow-exchange", "ramses", "thena", "hyperswap"],
  ],
];

type RawPool = {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number | null;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  apyMean30d: number | null;
  stablecoin: boolean | null;
  ilRisk: string | null;
  exposure: string | null;
  sigma: number | null;
  outlier: boolean | null;
  poolMeta: string | null;
};

function categoryOf(project: string): CategoryId | null {
  for (const [id, prefixes] of CATEGORY_MATCH) {
    for (const prefix of prefixes) {
      if (project === prefix || project.startsWith(prefix)) return id;
    }
  }
  return null;
}

/**
 * Depth is risk, taken from what the pool actually is: a single-asset
 * stablecoin position sits at the surface, anything carrying impermanent loss
 * or multiple assets sits deep, and a pool leaning on incentives is pushed one
 * band down because incentives stop.
 */
function tierOf(pool: RawPool): TierKey {
  const stable = pool.stablecoin === true;
  const il = pool.ilRisk === "yes";
  const multi = pool.exposure === "multi";

  let tier: TierKey = il || multi ? "mantle" : stable ? "placer" : "lode";

  const apy = pool.apy ?? 0;
  const reward = pool.apyReward ?? 0;
  if (apy > 0 && reward / apy > 0.5) tier = tier === "placer" ? "lode" : "mantle";
  if ((pool.sigma ?? 0) > 0.6 && tier === "placer") tier = "lode";

  return tier;
}

const VERSION = /^v\d+$/i;

function labelOf(project: string) {
  return project
    .split("-")
    .map((part) => (VERSION.test(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/* ---------------------------------------------------------------- */

let cache: { snapshot: FieldSnapshot; at: number } | null = null;
let inflight: Promise<FieldSnapshot> | null = null;

async function fetchPools(): Promise<RawPool[]> {
  const res = await fetch(SOURCE, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`yields ${res.status}`);
  const body = (await res.json()) as { status?: string; data?: RawPool[] };
  if (!Array.isArray(body.data)) throw new Error("yields payload malformed");
  return body.data;
}

function bind(raw: RawPool[]): FieldSnapshot {
  const usable = raw.filter(
    (pool) =>
      !pool.outlier &&
      pool.apy != null &&
      pool.apy >= 0.1 &&
      pool.apy <= 60 &&
      (pool.tvlUsd ?? 0) >= MIN_TVL &&
      CHAINS.has(pool.chain),
  );

  const byCategory = new Map<CategoryId, RawPool[]>();
  for (const pool of usable) {
    const category = categoryOf(pool.project);
    if (!category) continue;
    const list = byCategory.get(category);
    if (list) list.push(pool);
    else byCategory.set(category, [pool]);
  }

  const sites: FieldPool[] = [];
  const districts = DISTRICTS.map((district) => {
    const pool = byCategory.get(district.category) ?? [];
    const ground = sitesIn(district.id as DistrictId);

    // Deepest pockets get surveyed first, then the richest rate goes to the
    // highest ground — so reading the relief reads the yield curve.
    const chosen = [...pool].sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0)).slice(0, ground.length);
    chosen.sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0));
    const ranked = [...ground].sort((a, b) => b.metres - a.metres);

    chosen.forEach((entry, i) => {
      const site = ranked[i];
      if (!site) return;
      sites.push({
        siteId: site.id,
        poolId: entry.pool,
        project: entry.project,
        projectLabel: labelOf(entry.project),
        symbol: entry.symbol,
        chain: entry.chain,
        apy: entry.apy ?? 0,
        apyBase: entry.apyBase,
        apyReward: entry.apyReward,
        apyMean30d: entry.apyMean30d,
        tvlUsd: entry.tvlUsd ?? 0,
        tier: tierOf(entry),
        stablecoin: entry.stablecoin === true,
        ilRisk: entry.ilRisk === "yes",
        multiAsset: entry.exposure === "multi",
        sigma: entry.sigma,
        poolMeta: entry.poolMeta,
        url: `https://defillama.com/yields/pool/${entry.pool}`,
      });
    });

    const apys = chosen.map((entry) => entry.apy ?? 0);
    return {
      id: district.id,
      category: district.category,
      poolCount: chosen.length,
      tvlUsd: chosen.reduce((sum, entry) => sum + (entry.tvlUsd ?? 0), 0),
      medianApy: median(apys),
      topApy: apys.length ? Math.max(...apys) : 0,
    };
  });

  return {
    updatedAt: Date.now(),
    stale: false,
    poolsConsidered: usable.length,
    districts,
    sites,
  };
}

/**
 * Fresh within the TTL, otherwise refetched. If the source is down we keep
 * serving the last good survey and say so rather than showing nothing.
 */
export async function getFieldSnapshot(): Promise<FieldSnapshot> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.snapshot;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const snapshot = bind(await fetchPools());
      cache = { snapshot, at: Date.now() };
      return snapshot;
    } catch (error) {
      if (cache) return { ...cache.snapshot, stale: true };
      throw error;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function getSitePool(siteId: string) {
  const snapshot = await getFieldSnapshot().catch(() => null);
  return snapshot?.sites.find((site) => site.siteId === siteId) ?? null;
}
