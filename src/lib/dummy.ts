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
    id: "pulse",
    name: "Pulse",
    tagline: "Short lock, faster turnover",
    lockSeconds: 30 * DAY_SECONDS,
    minUsd: 100,
    maxUsd: 10_000,
    apyBps: 800,
    emergencyFeeBps: 1500,
  },
  {
    id: "horizon",
    name: "Horizon",
    tagline: "Balanced yield and commitment",
    lockSeconds: 90 * DAY_SECONDS,
    minUsd: 250,
    maxUsd: 25_000,
    apyBps: 1200,
    emergencyFeeBps: 1200,
  },
  {
    id: "apex",
    name: "Apex",
    tagline: "Longest lock, highest coupon",
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
    claimedUsdt: 12.4,
    status: "locked" as const,
  },
  {
    tokenId: 2,
    assetId: "usdt",
    principalAmount: 2500,
    planId: "pulse",
    startedAgoMs: 32 * DAY_SECONDS * 1000,
    claimedUsdt: 14.8,
    status: "locked" as const,
  },
  {
    tokenId: 3,
    assetId: "wbtc",
    principalAmount: 0.15,
    planId: "apex",
    startedAgoMs: 10 * DAY_SECONDS * 1000,
    claimedUsdt: 0,
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
      claimedUsdt: spec.claimedUsdt,
      status: spec.status,
    }),
  );
}

export const NEXT_TOKEN_ID = 4;
