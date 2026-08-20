"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";

import { useCatalog } from "@/hooks/use-catalog";
import { useSession } from "@/hooks/use-session";
import { buildPositionView } from "@/lib/math";
import { RARITY, STATUS, TIER, lensAbi, slugFromBytes32 } from "@/lib/protocol-abi";
import type { PositionNft, PositionStatus, PositionView, Rarity, SizeTier } from "@/lib/types";

type LensRow = {
  tokenId: bigint;
  owner: `0x${string}`;
  asset: `0x${string}`;
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

export function usePositions(now: number) {
  const { user } = useSession();
  const { address } = useAccount();
  const catalog = useCatalog();
  const [positions, setPositions] = useState<PositionNft[]>([]);
  const protocol = catalog?.protocol;
  const owner = address ?? (user?.address as `0x${string}` | undefined);

  const chainQuery = useReadContract({
    address: protocol?.lens,
    abi: lensAbi,
    functionName: "positionsOf",
    chainId: protocol?.chainId,
    args: owner ? [owner] : undefined,
    query: {
      enabled: Boolean(protocol?.lens && owner),
      refetchInterval: 20_000,
      refetchOnWindowFocus: false,
    },
  });

  const refreshMongo = useCallback(async () => {
    if (!user || protocol) {
      if (!user) setPositions([]);
      return;
    }
    const res = await fetch("/api/positions");
    if (!res.ok) return;
    const data = (await res.json()) as { positions: PositionNft[] };
    setPositions(data.positions);
  }, [user, protocol]);

  useEffect(() => {
    void refreshMongo();
  }, [refreshMongo]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshMongo(), chainQuery.refetch()]);
  }, [refreshMongo, chainQuery]);

  const views: PositionView[] = useMemo(() => {
    if (!catalog) return [];
    if (protocol && Array.isArray(chainQuery.data)) {
      return (chainQuery.data as LensRow[]).flatMap((row) => {
        const slug = slugFromBytes32(row.planSlug);
        const token = catalog.tokens.find((item) => item.address.toLowerCase() === row.asset.toLowerCase());
        const plan = catalog.plans.find((item) => item.id === slug);
        if (!token || !plan) return [];
        const principalAmount = Number(formatUnits(row.principal, token.decimals));
        const startedAt = Number(row.startedAt) * 1000;
        const unlockAt = Number(row.unlockAt) * 1000;
        const status = (STATUS[row.status] ?? "locked") as PositionStatus;
        const nft: PositionNft = {
          tokenId: Number(row.tokenId),
          owner: row.owner,
          assetId: token.id,
          principalAmount,
          planId: plan.id,
          startedAt,
          rarity: (RARITY[row.rarity] ?? "common") as Rarity,
          sizeTier: (TIER[row.sizeTier] ?? "spark") as SizeTier,
          claimedReward: Number(formatUnits(row.claimedReward, token.decimals)),
          status,
          unlockedAt: row.unlockedAt ? Number(row.unlockedAt) * 1000 : undefined,
        };
        const view = buildPositionView(nft, token, plan, now);
        const accruedReward = Number(formatUnits(row.accruedReward, token.decimals));
        const claimableReward = Number(formatUnits(row.claimableReward, token.decimals));
        // Prefer live accrual from wall clock once we have the row; lens claimable
        // is a snapshot from the last refetch.
        const liveClaimable = Math.max(claimableReward, view.claimableReward);
        return [
          {
            ...view,
            accruedReward: Math.max(accruedReward, view.accruedReward),
            claimableReward: liveClaimable,
            accruedUsd: Math.max(accruedReward, view.accruedReward) * token.priceUsd,
            claimableUsd: liveClaimable * token.priceUsd,
            unlockAt,
            lockProgress: Number(row.lockProgressBps) / 10_000,
            remainingMs: Math.max(0, unlockAt - now),
            isMatured: row.matured || now >= unlockAt,
            plan: { ...plan, apyBps: row.apyBps, emergencyFeeBps: row.emergencyFeeBps, lockSeconds: row.lockSeconds },
          },
        ];
      });
    }
    return positions.flatMap((position) => {
      const token = catalog.tokens.find((item) => item.id === position.assetId);
      const plan = catalog.plans.find((item) => item.id === position.planId);
      if (!token || !plan) return [];
      return [buildPositionView(position, token, plan, now)];
    });
  }, [catalog, protocol, chainQuery.data, positions, now]);

  const loading =
    Boolean(protocol && owner) && chainQuery.isLoading && !chainQuery.data;

  return {
    positions,
    views,
    refresh,
    catalog,
    onChain: Boolean(protocol),
    loading,
  };
}
