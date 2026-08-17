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
  active?: boolean;
  network?: "anvil" | "sepolia" | "mainnet" | "custom";
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
  active?: boolean;
  onChainId?: number;
};

export type ProtocolConfig = {
  networkId: "anvil" | "sepolia" | "mainnet";
  mode: "lab" | "test" | "live";
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  vault: `0x${string}`;
  card: `0x${string}`;
  oracle: `0x${string}`;
  lens: `0x${string}`;
  planIds: Record<string, number>;
};

export type AppNetworkView = {
  id: "anvil" | "sepolia" | "mainnet";
  name: string;
  shortLabel: string;
  mode: "lab" | "test" | "live";
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  capabilities: {
    warp: boolean;
    faucet: boolean;
    deployMocks: boolean;
  };
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
