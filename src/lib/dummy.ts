import { DEFAULT_BEARINGS } from "@/lib/brand";
import { DAY_SECONDS, principalUsd, rarityFrom, sizeTierFromUsd } from "@/lib/math";
import type { Plan, PositionNft, Token } from "@/lib/types";

export const MOCK_WALLET = "0x7A3e91B4c8d2F0E6A1b9C4d5E8f7A0B3c4d5e6F7";

export const REWARD_SYMBOL = "USDT";

export const TOKENS: Token[] = [
  {
    id: "usdt",
    symbol: "USDT",
    name: "Tether USD",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    priceUsd: 1,
    color: "#26A17B",
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    priceUsd: 1,
    color: "#2775CA",
  },
  {
    id: "weth",
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    priceUsd: 3500,
    color: "#8B5CF6",
  },
  {
    id: "wbtc",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    priceUsd: 95_000,
    color: "#F7931A",
  },
];

export const PLANS: Plan[] = [
  {
    id: DEFAULT_BEARINGS[0].slug,
    name: DEFAULT_BEARINGS[0].name,
    tagline: DEFAULT_BEARINGS[0].tagline,
    lockSeconds: 30 * DAY_SECONDS,
    minUsd: 100,
    maxUsd: 10_000,
    apyBps: 800,
    emergencyFeeBps: 1500,
  },
  {
    id: DEFAULT_BEARINGS[1].slug,
    name: DEFAULT_BEARINGS[1].name,
    tagline: DEFAULT_BEARINGS[1].tagline,
    lockSeconds: 90 * DAY_SECONDS,
    minUsd: 250,
    maxUsd: 25_000,
    apyBps: 1200,
    emergencyFeeBps: 1200,
  },
  {
    id: DEFAULT_BEARINGS[2].slug,
    name: DEFAULT_BEARINGS[2].name,
    tagline: DEFAULT_BEARINGS[2].tagline,
    lockSeconds: 180 * DAY_SECONDS,
    minUsd: 500,
    maxUsd: 50_000,
    apyBps: 1800,
    emergencyFeeBps: 1000,
  },
];

export function getToken(id: string) {
  const token = TOKENS.find((item) => item.id === id);
  if (!token) throw new Error(`Unknown token: ${id}`);
  return token;
}

export function getPlan(id: string) {
  const plan = PLANS.find((item) => item.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

function seedPosition(partial: Omit<PositionNft, "rarity" | "sizeTier">): PositionNft {
  const token = getToken(partial.assetId);
  const plan = getPlan(partial.planId);
  const usd = principalUsd(partial.principalAmount, token.priceUsd);
  return {
    ...partial,
    rarity: rarityFrom(plan.lockSeconds, usd),
    sizeTier: sizeTierFromUsd(usd),
  };
}

const SEED_OFFSETS = [
  {
    tokenId: 1,
    assetId: "weth",
    principalAmount: 0.5,
    planId: "horizon",
    startedAgoMs: 20 * DAY_SECONDS * 1000,
    claimedReward: 0.004,
    status: "locked" as const,
  },
  {
    tokenId: 2,
    assetId: "usdt",
    principalAmount: 2500,
    planId: "pulse",
    startedAgoMs: 32 * DAY_SECONDS * 1000,
    claimedReward: 14.8,
    status: "locked" as const,
  },
  {
    tokenId: 3,
    assetId: "wbtc",
    principalAmount: 0.15,
    planId: "apex",
    startedAgoMs: 10 * DAY_SECONDS * 1000,
    claimedReward: 0,
    status: "locked" as const,
  },
];

export function materializeSeeds(now: number): PositionNft[] {
  return SEED_OFFSETS.map((spec) =>
    seedPosition({
      tokenId: spec.tokenId,
      owner: MOCK_WALLET,
      assetId: spec.assetId,
      principalAmount: spec.principalAmount,
      planId: spec.planId,
      startedAt: now - spec.startedAgoMs,
      claimedReward: spec.claimedReward,
      status: spec.status,
    }),
  );
}

export const NEXT_TOKEN_ID = 4;

export type DemoMonthEarn = {
  year: number;
  month: number;
  usd: number;
  tokenId: string;
  tokenAmount: number;
};

/** Illustrated coupon ledger for the landing timeline. Not live volume. */
export const DEMO_MONTHLY_EARNINGS: DemoMonthEarn[] = [
  { year: 2026, month: 8, usd: 21_840, tokenId: "weth", tokenAmount: 6.24 },
  { year: 2026, month: 7, usd: 18_420, tokenId: "wbtc", tokenAmount: 0.194 },
  { year: 2026, month: 6, usd: 16_110, tokenId: "usdt", tokenAmount: 16_110 },
  { year: 2026, month: 5, usd: 19_760, tokenId: "weth", tokenAmount: 5.645 },
  { year: 2026, month: 4, usd: 14_280, tokenId: "usdc", tokenAmount: 14_280 },
  { year: 2026, month: 3, usd: 17_940, tokenId: "wbtc", tokenAmount: 0.189 },
  { year: 2026, month: 2, usd: 12_650, tokenId: "usdt", tokenAmount: 12_650 },
  { year: 2026, month: 1, usd: 15_330, tokenId: "weth", tokenAmount: 4.38 },
  { year: 2025, month: 12, usd: 22_410, tokenId: "wbtc", tokenAmount: 0.236 },
  { year: 2025, month: 11, usd: 13_880, tokenId: "usdc", tokenAmount: 13_880 },
  { year: 2025, month: 10, usd: 16_720, tokenId: "weth", tokenAmount: 4.777 },
  { year: 2025, month: 9, usd: 11_540, tokenId: "usdt", tokenAmount: 11_540 },
];

