import type { PositionNft } from "@/lib/types";

export function mapPosition(doc: {
  tokenId: number;
  owner: string;
  assetId: string;
  principalAmount: number;
  planId: string;
  startedAt: number;
  rarity: string;
  sizeTier: string;
  claimedUsdt: number;
  claimedReward?: number;
  status: string;
  unlockedAt?: number;
}): PositionNft {
  return {
    tokenId: doc.tokenId,
    owner: doc.owner,
    assetId: doc.assetId,
    principalAmount: doc.principalAmount,
    planId: doc.planId,
    startedAt: doc.startedAt,
    rarity: doc.rarity as PositionNft["rarity"],
    sizeTier: doc.sizeTier as PositionNft["sizeTier"],
    claimedReward: Number(doc.claimedReward ?? doc.claimedUsdt ?? 0),
    status: doc.status as PositionNft["status"],
    unlockedAt: doc.unlockedAt,
  };
}
