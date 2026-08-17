export type Rarity = "common" | "rare" | "epic" | "legendary";

export type SizeTier = "spark" | "vault" | "sovereign";

export type PositionStatus =
  | "locked"
  | "matured"
  | "unlocked"
  | "emergencyExited";

export type Token = {
  id: string;
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  priceUsd: number;
  color: string;
};

export type Plan = {
  id: string;
  name: string;
  tagline: string;
  lockSeconds: number;
  minUsd: number;
  maxUsd: number;
  apyBps: number;
  emergencyFeeBps: number;
};

export type PositionNft = {
  tokenId: number;
  owner: string;
  assetId: string;
  principalAmount: number;
  planId: string;
  startedAt: number;
  rarity: Rarity;
  sizeTier: SizeTier;
  claimedUsdt: number;
  status: PositionStatus;
  unlockedAt?: number;
};

export type PositionView = PositionNft & {
  token: Token;
  plan: Plan;
  principalUsd: number;
  accruedUsdt: number;
  claimableUsdt: number;
  unlockAt: number;
  lockProgress: number;
  remainingMs: number;
  isMatured: boolean;
};
