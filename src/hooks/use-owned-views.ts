"use client";

import { useMemo } from "react";

import { getPlan, getToken } from "@/lib/dummy";
import { buildPositionView } from "@/lib/math";
import { useVaultStore } from "@/store/vault-store";
import type { PositionView } from "@/lib/types";

export function useOwnedViews(now: number): PositionView[] {
  const address = useVaultStore((s) => s.address);
  const positions = useVaultStore((s) => s.positions);

  return useMemo(() => {
    if (!address) return [];
    return positions
      .filter((position) => position.owner.toLowerCase() === address.toLowerCase())
      .map((position) =>
        buildPositionView(position, getToken(position.assetId), getPlan(position.planId), now),
      );
  }, [address, positions, now]);
}

export function usePositionView(tokenId: number, now: number): PositionView | null {
  const positions = useVaultStore((s) => s.positions);

  return useMemo(() => {
    const position = positions.find((item) => item.tokenId === tokenId);
    if (!position) return null;
    return buildPositionView(position, getToken(position.assetId), getPlan(position.planId), now);
  }, [positions, tokenId, now]);
}
