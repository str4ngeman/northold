"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { TokenMark } from "@/components/brand/token-mark";
import { Hint } from "@/components/ui/hint";
import { Surface } from "@/components/ui/surface";
import {
  formatApy,
  formatCountdown,
  formatTokenAmount,
  formatTokenId,
  formatUsd,
} from "@/lib/format";
import type { PositionView } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PositionCard({
  view,
  href,
  featured,
}: {
  view: PositionView;
  href?: string;
  featured?: boolean;
}) {
  const charging = view.status === "locked" && !view.isMatured;
  const body = (
    <Surface
      hover={Boolean(href)}
      className={cn("relative overflow-hidden p-5", featured && "p-7")}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full opacity-30 blur-3xl"
        style={{ background: view.token.color }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <TokenMark id={view.token.id} symbol={view.token.symbol} color={view.token.color} size={featured ? 48 : 40} />
          <div>
            <p className="text-sm font-semibold">{view.token.symbol}</p>
            <p className="text-xs text-[var(--ink-3)]">{view.plan.name}</p>
          </div>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-[var(--ink-2)]">
          {formatTokenId(view.tokenId)}
        </span>
      </div>

      <p className={cn("num mt-5 font-semibold tracking-tight", featured ? "text-4xl" : "text-2xl")}>
        {formatUsd(view.principalUsd)}
      </p>
      <p className="mt-1 text-sm text-[var(--ink-3)]">
        {formatTokenAmount(view.principalAmount, view.token.symbol)}
      </p>

      <div className="mt-5 flex items-center justify-between text-sm">
        <Hint text="Simple USDT yield. Claim any day — it does not compound.">
          <span className="text-[var(--gain)] font-medium">{formatApy(view.plan.apyBps)}</span>
        </Hint>
        <span className="text-[var(--ink-3)]">
          {charging ? formatCountdown(view.remainingMs) : view.status === "unlocked" ? "Redeemed" : view.status === "emergencyExited" ? "Exited early" : "Ready"}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
        <motion.span
          className="block h-full rounded-full bg-[linear-gradient(90deg,#5ec4b6,#d9b56a)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, view.lockProgress * 100)}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">Claimable USDT</p>
          <p className="num mt-0.5 text-lg font-semibold text-[var(--gain)]">{formatUsd(view.claimableUsdt)}</p>
        </div>
        {href && <span className="text-xs text-[var(--light)]">Open →</span>}
      </div>
    </Surface>
  );

  if (!href) return body;
  return <Link href={href}>{body}</Link>;
}
