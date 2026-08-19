/** Shared between the server that binds the data and the client that draws it. */

export type TierKey = "placer" | "lode" | "mantle";

export type CategoryId = "rwa" | "staking" | "fixed" | "vaults" | "lending" | "dex";

/** One real pool, pegged to one site on the sheet. */
export type FieldPool = {
  siteId: string;
  poolId: string;
  project: string;
  projectLabel: string;
  symbol: string;
  chain: string;
  /** Total APY as reported, in percent. */
  apy: number;
  /** Organic yield, excluding incentives. */
  apyBase: number | null;
  /** Incentive yield. High share of this is why a site is marked deeper. */
  apyReward: number | null;
  apyMean30d: number | null;
  tvlUsd: number;
  tier: TierKey;
  stablecoin: boolean;
  ilRisk: boolean;
  multiAsset: boolean;
  /** Standard deviation of the pool's own APY — how twitchy the ground is. */
  sigma: number | null;
  poolMeta: string | null;
  url: string;
};

export type FieldDistrictStat = {
  id: string;
  category: CategoryId;
  poolCount: number;
  tvlUsd: number;
  medianApy: number;
  topApy: number;
};

export type FieldSnapshot = {
  updatedAt: number;
  /** Whether this came off the wire or out of the last good copy. */
  stale: boolean;
  poolsConsidered: number;
  districts: FieldDistrictStat[];
  sites: FieldPool[];
};
