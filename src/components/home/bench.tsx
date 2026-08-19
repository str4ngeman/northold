"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Head, Row, Wipe } from "@/components/kit";
import { TokenMark } from "@/components/brand/token-mark";
import { TOKENS } from "@/lib/dummy";
import { formatTokenAmount, formatUsd } from "@/lib/format";
import { dailyReward, projectedReward } from "@/lib/math";
import { gradeLabel, seamOf } from "@/lib/seams";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

const STOPS = [500, 1_000, 5_000, 10_000, 25_000, 50_000];

export function Bench({ plans }: { plans: Plan[] }) {
  const [usd, setUsd] = useState(10_000);
  const [planId, setPlanId] = useState(plans[2]?.id ?? plans[0]?.id ?? "apex");
  const [tokenId, setTokenId] = useState(TOKENS[0]?.id ?? "usdt");

  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const token = TOKENS.find((t) => t.id === tokenId) ?? TOKENS[0];
  const seam = seamOf(plan?.id ?? "", plan?.lockSeconds);

  const amount = plan && token ? usd / token.priceUsd : 0;
  const coupon = plan ? projectedReward(amount, plan.apyBps, plan.lockSeconds) : 0;
  const perDay = plan ? dailyReward(amount, plan.apyBps) : 0;
  const days = plan ? Math.round(plan.lockSeconds / 86400) : 0;

  // accrual is linear, so the curve is a ramp — draw it honestly
  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push(`${(t * 560).toFixed(1)} ${(120 - t * 104).toFixed(1)}`);
    }
    return `M${pts.join("L")}`;
  }, []);

  if (!plan || !token) return null;
  const outOfRange = usd < plan.minUsd || usd > plan.maxUsd;

  return (
    <section id="bench" className="mx-auto max-w-[1280px] px-4 py-24 lg:px-12 lg:py-32">
      <Head
        index="03"
        meta="Assay bench"
        title={
          <>
            Work the <span className="text-flux">numbers</span> before you commit.
          </>
        }
        lead="Simple interest, no compounding inside the shaft, no fee on the way in. What you see here is what the contract pays."
      />

      <div className="mt-16 grid gap-px bg-[var(--rule)] lg:grid-cols-2">
        <Wipe className="bg-[#0b0b0c] p-7 lg:p-9">
          <p className="tag">Asset</p>
          <div className="mt-3 grid grid-cols-4 gap-px bg-[var(--rule)]">
            {TOKENS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTokenId(item.id)}
                className={cn(
                  "flex flex-col items-center gap-2 py-4 transition-colors",
                  item.id === token.id ? "bg-[var(--slate-2)]" : "bg-[#0b0b0c] hover:bg-[var(--slate)]",
                )}
              >
                <TokenMark id={item.id} symbol={item.symbol} size={26} />
                <span className="num text-[9px] tracking-[0.12em]">{item.symbol}</span>
              </button>
            ))}
          </div>

          <p className="tag mt-8">Seam</p>
          <div className="mt-3 grid gap-px bg-[var(--rule)] sm:grid-cols-3">
            {plans.map((item) => {
              const s = seamOf(item.id, item.lockSeconds);
              const on = item.id === plan.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlanId(item.id)}
                  className={cn("bg-[#0b0b0c] p-3 text-left transition-colors", on ? "bg-[var(--slate-2)]" : "hover:bg-[var(--slate)]")}
                >
                  <span className="num block text-[10px] tracking-[0.14em]" style={{ color: on ? s.color : "var(--bone-3)" }}>
                    {s.index} · {s.name}
                  </span>
                  <span className="num mt-1.5 block text-sm">{gradeLabel(item.apyBps)}%</span>
                  <span className="num mt-0.5 block text-[10px] text-bone-3">
                    {Math.round(item.lockSeconds / 86400)} D
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-baseline justify-between">
            <p className="tag">Stake</p>
            <p className="num text-lg">{formatUsd(usd, 0)}</p>
          </div>
          <input
            type="range"
            min={500}
            max={50_000}
            step={500}
            value={usd}
            onChange={(e) => setUsd(Number(e.target.value))}
            className="mt-4 w-full"
            aria-label="Stake in dollars"
          />
          <div className="mt-3 flex flex-wrap gap-px bg-[var(--rule)]">
            {STOPS.map((stop) => (
              <button
                key={stop}
                type="button"
                onClick={() => setUsd(stop)}
                className={cn(
                  "num flex-1 bg-[#0b0b0c] px-2 py-2 text-[10px] tracking-[0.1em] transition-colors",
                  usd === stop ? "bg-[var(--slate-2)] text-flux" : "text-bone-3 hover:text-bone",
                )}
              >
                {stop >= 1000 ? `${stop / 1000}k` : stop}
              </button>
            ))}
          </div>
          {outOfRange ? (
            <p className="num mt-3 text-[10px] text-ember">
              OUTSIDE {seam.name.toUpperCase()} RANGE · {formatUsd(plan.minUsd, 0)}–{formatUsd(plan.maxUsd, 0)}
            </p>
          ) : null}
        </Wipe>

        <Wipe delay={0.08} className="flex flex-col bg-[#0b0b0c] p-7 lg:p-9">
          <p className="tag">Coupon at {days} days</p>
          <p className="num mt-3 break-all text-[clamp(1.9rem,4.4vw,3rem)] leading-none" style={{ color: seam.color }}>
            {formatTokenAmount(coupon, token.symbol)}
          </p>
          <p className="num mt-2 text-sm text-bone-2">≈ {formatUsd(coupon * token.priceUsd)}</p>

          <svg viewBox="0 0 560 130" className="mt-8 w-full" aria-hidden>
            <line x1="0" y1="120" x2="560" y2="120" stroke="var(--rule)" />
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <line key={t} x1={t * 560} y1="112" x2={t * 560} y2="120" stroke="var(--rule)" />
            ))}
            <path d={`${curve}L560 120L0 120Z`} fill={seam.color} fillOpacity="0.1" />
            <path d={curve} fill="none" stroke={seam.color} strokeWidth="1.6" />
            <circle cx="560" cy="16" r="3" fill={seam.color} />
          </svg>
          <div className="num flex justify-between text-[10px] tracking-[0.12em] text-bone-3">
            <span>MINT</span>
            <span>MATURITY</span>
          </div>

          <dl className="mt-8">
            <Row label="Per day" value={formatTokenAmount(perDay, token.symbol)} />
            <Row label="Per week" value={formatTokenAmount(perDay * 7, token.symbol)} />
            <Row label="Grade" value={`${gradeLabel(plan.apyBps)} %`} accent={seam.color} />
            <Row label="Returned at term" value={formatTokenAmount(amount, token.symbol)} />
          </dl>

          <Link href={`/app/stake?plan=${plan.id}`} className="act act-solid mt-9 w-full">
            <span>
              Sink {formatUsd(usd, 0)} to {seam.name}
            </span>
          </Link>
        </Wipe>
      </div>
    </section>
  );
}
