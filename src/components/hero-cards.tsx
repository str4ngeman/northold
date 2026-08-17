"use client";

import { getPlan, getToken, materializeSeeds } from "@/lib/dummy";
import { buildPositionView } from "@/lib/math";
import { VaultCard } from "@/components/vault-card";
import { useNow } from "@/hooks/use-now";

export function HeroCards() {
  const now = useNow(1000);

  const views = materializeSeeds(now).map((position) =>
    buildPositionView(position, getToken(position.assetId), getPlan(position.planId), now),
  );

  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[420px]">
      {views.map((view, index) => (
        <div
          key={view.tokenId}
          className="absolute left-1/2 top-6 origin-bottom transition-transform hover:z-10 hover:-translate-y-2"
          style={{
            transform: `translateX(calc(-50% + ${(index - 1) * 42}px)) rotate(${(index - 1) * 8}deg)`,
            zIndex: index === 1 ? 3 : 1,
          }}
        >
          <VaultCard view={view} size="sm" />
        </div>
      ))}
    </div>
  );
}
