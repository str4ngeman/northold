"use client";

import { useCallback, useEffect, useState } from "react";

import { buildPositionView } from "@/lib/math";
import type { PositionNft, PositionView } from "@/lib/types";
import { useCatalog } from "@/hooks/use-catalog";
import { useSession } from "@/hooks/use-session";

export function usePositions(now: number) {
  const { user } = useSession();
  const catalog = useCatalog();
  const [positions, setPositions] = useState<PositionNft[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setPositions([]);
      return;
    }
    const res = await fetch("/api/positions");
    if (!res.ok) return;
    const data = (await res.json()) as { positions: PositionNft[] };
    setPositions(data.positions);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const views: PositionView[] =
    catalog && positions.length
      ? positions.flatMap((position) => {
          const token = catalog.tokens.find((item) => item.id === position.assetId);
          const plan = catalog.plans.find((item) => item.id === position.planId);
          if (!token || !plan) return [];
          return [buildPositionView(position, token, plan, now)];
        })
      : [];

  return { positions, views, refresh, catalog };
}
