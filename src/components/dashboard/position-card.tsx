"use client";

import Link from "next/link";

import { Meter } from "@/components/kit";
import { TokenMark } from "@/components/brand/token-mark";
import {
  formatCountdown,
  formatTokenAmount,
  formatTokenId,
  formatUsd,
} from "@/lib/format";
import { gradeLabel, seamOf } from "@/lib/seams";
import type { PositionView } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE: Record<string, string> = {
  locked: "Sunk",
  matured: "Liftable",
  unlocked: "Hauled",
  emergencyExited: "Abandoned",
};

/**
 * A shaft, as it reads on the register: what went down, how far along the term
 * it is, and what is sitting at the collar waiting to be lifted.
 */
export function PositionCard({
  view,
  href,
  featured,
}: {
  view: PositionView;
  href?: string;
  featured?: boolean;
}) {
  const seam = seamOf(view.plan.id, view.plan.lockSeconds);
  const running = view.status === "locked" && !view.isMatured;
  const day = Math.round((view.plan.lockSeconds / 86400) * view.lockProgress);
  const days = Math.round(view.plan.lockSeconds / 86400);

  const body = (
    <div
      className={cn(
        "panel ticked group relative h-full bg-[#0b0b0c] transition-colors duration-300",
        href && "hover:bg-[var(--slate)]",
      )}
    >
      <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: seam.color, opacity: 0.65 }} />

      <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] p-4">
        <div className="flex items-center gap-3">
          <TokenMark id={view.token.id} symbol={view.token.symbol} size={featured ? 40 : 32} />
          <div>
            <p className="num text-[11px] tracking-[0.1em]">SHAFT {formatTokenId(view.tokenId)}</p>
            <p className="num mt-1 text-[10px] text-bone-3">
              {seam.index} · {seam.name.toUpperCase()} · {days} D
            </p>
          </div>
        </div>
        <span
          className="num shrink-0 px-2 py-1 text-[9px] uppercase tracking-[0.14em]"
          style={{ color: seam.color, border: `1px solid ${seam.color}` }}
        >
          {STATE[view.status] ?? view.status}
        </span>
      </div>

      <div className="p-4">
        <p className="tag">Principal</p>
        <p className={cn("num mt-1.5 leading-none", featured ? "text-3xl" : "text-2xl")}>
          {formatTokenAmount(view.principalAmount, view.token.symbol)}
        </p>
        <p className="num mt-2 text-[11px] text-bone-3">≈ {formatUsd(view.principalUsd)}</p>

        <div className="mt-5">
          <Meter value={view.lockProgress} color={seam.color} />
        </div>
        <div className="num mt-1 flex items-center justify-between text-[10px] tracking-[0.1em] text-bone-3">
          <span>
            DAY {String(day).padStart(2, "0")} / {days}
          </span>
          <span style={{ color: seam.color }}>{gradeLabel(view.plan.apyBps)}%</span>
          <span>{running ? formatCountdown(view.remainingMs) : "TERM CLOSED"}</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 border-t border-[var(--rule)] p-4">
        <div>
          <p className="tag">Liftable</p>
          <p className="num mt-1.5 text-lg" style={{ color: seam.color }}>
            {formatTokenAmount(view.claimableReward, view.token.symbol)}
          </p>
        </div>
        {href ? (
          <span className="num text-[10px] uppercase tracking-[0.14em] text-bone-3 transition-colors group-hover:text-bone">
            Open ↗
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  );
}
