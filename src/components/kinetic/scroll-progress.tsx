"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type Lenis from "lenis";

export function ScrollProgress({ lenis }: { lenis: Lenis | null }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!lenis) return;
    const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => {
      setPct(limit ? scroll / limit : 0);
    };
    lenis.on("scroll", onScroll);
    return () => {
      lenis.off("scroll", onScroll);
    };
  }, [lenis]);

  return (
    <button
      className="progress"
      style={{ "--percent": pct.toFixed(4) } as CSSProperties}
      data-magnetic
      data-hover="true"
      data-welcome="percent"
      aria-label="Back to top"
      type="button"
      onClick={() => lenis?.scrollTo(0)}
    >
      <span className="progress__num">{Math.round(pct * 100)}%</span>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="49" pathLength="1" />
      </svg>
    </button>
  );
}
