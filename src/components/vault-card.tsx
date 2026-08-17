import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import {
  formatApy,
  formatCountdown,
  formatTokenAmount,
  formatTokenId,
  formatUsd,
  rarityLabel,
  sizeTierLabel,
} from "@/lib/format";
import type { PositionView, Rarity } from "@/lib/types";

const RARITY_FRAME: Record<Rarity, string> = {
  common: "from-zinc-400 via-zinc-600 to-zinc-400",
  rare: "from-sky-300 via-blue-700 to-sky-300",
  epic: "from-violet-300 via-fuchsia-800 to-violet-300",
  legendary: "from-amber-200 via-yellow-700 to-amber-200",
};

const RARITY_GLOW: Record<Rarity, string> = {
  common: "shadow-[0_0_40px_rgb(161_161_170/20%)]",
  rare: "shadow-[0_0_48px_rgb(56_189_248/28%)]",
  epic: "shadow-[0_0_48px_rgb(167_139_250/32%)]",
  legendary: "shadow-[0_0_56px_rgb(251_191_36/38%)]",
};

type VaultCardProps = {
  view: PositionView;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function VaultCard({ view, size = "md", className }: VaultCardProps) {
  const broken = view.status === "emergencyExited";
  const complete = view.status === "unlocked" || view.isMatured;
  const charging = view.status === "locked" && !view.isMatured;

  return (
    <article
      className={cn(
        "relative isolate rounded-[22px] p-[2px] bg-linear-to-br",
        RARITY_FRAME[view.rarity],
        RARITY_GLOW[view.rarity],
        size === "sm" && "w-[220px]",
        size === "md" && "w-[260px]",
        size === "lg" && "w-[300px]",
        broken && "grayscale-[0.35]",
        className,
      )}
      style={{ "--asset": view.token.color } as CSSProperties}
    >
      <div
        className="relative overflow-hidden rounded-[20px] text-white"
        style={{
          background: `linear-gradient(165deg, #16161f 0%, #0c0c12 48%, ${view.token.color}26 100%)`,
          aspectRatio: "5 / 7",
        }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-10 size-48 rounded-full opacity-40 blur-3xl"
          style={{ background: view.token.color }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay">
          <div className="absolute inset-6 font-display text-[88px] leading-none tracking-widest">
            {view.token.symbol.slice(0, 1)}
          </div>
        </div>

        <div className="relative flex h-full flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-[10px] tracking-[0.28em] text-white/55 uppercase">
                Vault Card
              </p>
              <p className="font-display text-lg leading-tight">{rarityLabel(view.rarity)}</p>
            </div>
            <div className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 font-mono text-[11px] text-amber-200">
              {formatTokenId(view.tokenId)}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div
              className="grid size-11 place-items-center rounded-full border border-white/20 font-display text-sm"
              style={{ background: `${view.token.color}33` }}
            >
              {view.token.symbol.slice(0, 2)}
            </div>
            <div>
              <p className="text-xs text-white/55">{view.token.name}</p>
              <p className="font-medium tracking-tight">
                {formatTokenAmount(view.principalAmount, view.token.symbol)}
              </p>
              <p className="text-[11px] text-white/45">{formatUsd(view.principalUsd)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>{view.plan.name} plan</span>
              <span className="text-amber-200">{formatApy(view.plan.apyBps)}</span>
            </div>
            <p className="mt-2 text-[10px] tracking-wide text-white/45 uppercase">
              Accrued USDT
            </p>
            <p className="font-mono text-xl tabular-nums tracking-tight text-emerald-300">
              {formatUsd(view.accruedUsdt)}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  complete ? "bg-amber-300" : "bg-emerald-400",
                )}
                style={{ width: `${Math.max(4, view.lockProgress * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-white/50">
              <span>{charging ? formatCountdown(view.remainingMs) : complete ? "Seal complete" : "Broken seal"}</span>
              <span>{Math.round(view.lockProgress * 100)}%</span>
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between pt-4">
            <p className="max-w-[60%] text-[10px] leading-snug text-white/45">
              {sizeTierLabel(view.sizeTier)}
            </p>
            <p className="font-display text-[10px] tracking-[0.2em] text-white/40">
              LEAGUETO
            </p>
          </div>
        </div>

        {broken && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-24deg,transparent,transparent_18px,rgb(0_0_0/0.28)_18px,rgb(0_0_0/0.28)_19px)]" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="rotate-[-18deg] rounded border-2 border-red-400/80 px-3 py-1 font-display text-sm tracking-[0.25em] text-red-300 uppercase">
                Broken seal
              </span>
            </div>
          </>
        )}

        {view.status === "unlocked" && (
          <div className="absolute right-3 bottom-14 rotate-12 rounded border border-amber-300/70 px-2 py-0.5 font-display text-[10px] tracking-[0.2em] text-amber-200 uppercase">
            Redeemed
          </div>
        )}
      </div>
    </article>
  );
}
