"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { VaultCard } from "@/components/vault-card";
import { useNow } from "@/hooks/use-now";
import { getPlan, getToken, materializeSeeds } from "@/lib/dummy";
import { buildPositionView } from "@/lib/math";
import { prefersReducedMotion } from "@/kinetic/scroll";

export function HeroCards() {
  const now = useNow(1000);
  const root = useRef<HTMLDivElement>(null);

  const views = materializeSeeds(now).map((position) =>
    buildPositionView(position, getToken(position.assetId), getPlan(position.planId), now),
  );

  useEffect(() => {
    const node = root.current;
    if (!node || prefersReducedMotion()) return;
    const cards = node.querySelectorAll(".hero__card");
    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        const float = card.querySelector(".hero__float");
        if (!float) return;
        gsap.to(float, {
          y: i % 2 === 0 ? -14 : 12,
          duration: 3.2 + i * 0.4,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
          delay: i * 0.2,
        });
      });
    }, node);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="hero__stack">
      {views.map((view, index) => (
        <div
          key={view.tokenId}
          className="hero__card"
          style={{
            zIndex: index === 1 ? 3 : 1,
            transform: `translateX(calc(-50% + ${(index - 1) * 52}px)) rotate(${(index - 1) * 9}deg)`,
          }}
        >
          <div className="hero__float">
            <VaultCard view={view} size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
