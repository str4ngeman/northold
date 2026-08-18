"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { MOCK_WALLET, NEXT_TOKEN_ID, getPlan, getToken } from "@/lib/dummy";
import { BRAND } from "@/lib/brand";
import {
  accruedReward,
  buildPositionView,
  claimableReward,
  elapsedSeconds,
  emergencyFeeAmount,
  principalUsd,
  rarityFrom,
  sizeTierFromUsd,
} from "@/lib/math";
import type { PositionNft } from "@/lib/types";

type MintInput = {
  assetId: string;
  planId: string;
  principalAmount: number;
};

type VaultState = {
  address: string | null;
  positions: PositionNft[];
  nextTokenId: number;
  connect: () => void;
  disconnect: () => void;
  mint: (input: MintInput) => PositionNft;
  claim: (tokenId: number, now?: number) => number;
  unlock: (tokenId: number, now?: number) => { principal: number; reward: number };
  emergencyUnlock: (
    tokenId: number,
    now?: number,
  ) => { returned: number; fee: number; forfeited: number };
};

function requirePosition(positions: PositionNft[], tokenId: number) {
  const position = positions.find((item) => item.tokenId === tokenId);
  if (!position) throw new Error("Position not found");
  return position;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      address: null,
      positions: [],
      nextTokenId: NEXT_TOKEN_ID,
      connect: () => set({ address: MOCK_WALLET }),
      disconnect: () => set({ address: null }),
      mint: ({ assetId, planId, principalAmount }) => {
        const { address, nextTokenId, positions } = get();
        if (!address) throw new Error("Connect a wallet first");
        const token = getToken(assetId);
        const plan = getPlan(planId);
        const usd = principalUsd(principalAmount, token.priceUsd);
        if (usd < plan.minUsd || usd > plan.maxUsd) {
          throw new Error("Amount is outside this plan’s range");
        }
        const position: PositionNft = {
          tokenId: nextTokenId,
          owner: address,
          assetId,
          principalAmount,
          planId,
          startedAt: Date.now(),
          rarity: rarityFrom(plan.lockSeconds, usd),
          sizeTier: sizeTierFromUsd(usd),
          claimedReward: 0,
          status: "locked",
        };
        set({
          positions: [position, ...positions],
          nextTokenId: nextTokenId + 1,
        });
        return position;
      },
      claim: (tokenId, now = Date.now()) => {
        const position = requirePosition(get().positions, tokenId);
        if (position.status === "emergencyExited" || position.status === "unlocked") {
          throw new Error("This card is no longer accruing");
        }
        const plan = getPlan(position.planId);
        const accrued = accruedReward(
          position.principalAmount,
          plan.apyBps,
          elapsedSeconds(position, plan.lockSeconds, now),
        );
        const amount = claimableReward(accrued, position.claimedReward, position.status);
        if (amount <= 0) throw new Error("Nothing to claim yet");
        set({
          positions: get().positions.map((item) =>
            item.tokenId === tokenId
              ? { ...item, claimedReward: item.claimedReward + amount }
              : item,
          ),
        });
        return amount;
      },
      unlock: (tokenId, now = Date.now()) => {
        const position = requirePosition(get().positions, tokenId);
        const token = getToken(position.assetId);
        const plan = getPlan(position.planId);
        const view = buildPositionView(position, token, plan, now);
        if (!view.isMatured) throw new Error("Lock is still active");
        const reward = view.claimableReward;
        set({
          positions: get().positions.map((item) =>
            item.tokenId === tokenId
              ? {
                  ...item,
                  claimedReward: item.claimedReward + reward,
                  status: "unlocked",
                  unlockedAt: now,
                }
              : item,
          ),
        });
        return { principal: position.principalAmount, reward };
      },
      emergencyUnlock: (tokenId, now = Date.now()) => {
        const position = requirePosition(get().positions, tokenId);
        if (position.status !== "locked") {
          throw new Error("Emergency unlock is only available on an active lock");
        }
        const token = getToken(position.assetId);
        const plan = getPlan(position.planId);
        const view = buildPositionView(position, token, plan, now);
        if (view.isMatured) throw new Error("This card is already matured — unlock normally");
        const fee = emergencyFeeAmount(position.principalAmount, plan.emergencyFeeBps);
        const returned = position.principalAmount - fee;
        const forfeited = view.claimableReward;
        set({
          positions: get().positions.map((item) =>
            item.tokenId === tokenId
              ? { ...item, status: "emergencyExited", unlockedAt: now }
              : item,
          ),
        });
        return { returned, fee, forfeited };
      },
    }),
    { name: BRAND.storage.hold },
  ),
);
