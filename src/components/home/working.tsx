"use client";

import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

import { Head, Meter, Row } from "@/components/kit";
import { TokenMark } from "@/components/brand/token-mark";
import { getToken } from "@/lib/dummy";
import { formatTokenAmount, formatUsd } from "@/lib/format";
import { SEAMS } from "@/lib/seams";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const CoreSample = dynamic(() => import("@/components/three/core-sample").then((m) => m.CoreSample), {
  ssr: false,
});

const PRINCIPAL = 25_000;
const APY = 0.12;
const DAYS = 90;
const FULL = PRINCIPAL * APY * (DAYS / 365.25);

const STEPS = [
  {
    n: "01",
    title: "Sink",
    body: "You pick the asset and the seam. The contract escrows the principal and mints one token that carries the depth, the coupon and the owner. Nothing about those three can be edited afterwards — not by you, not by us.",
    note: "One transaction. Two if the asset needs an allowance first.",
  },
  {
    n: "02",
    title: "Accrue",
    body: "The grade runs by the second against the asset you deposited. WETH earns WETH. USDC earns USDC. There is no wrapper to unwrap, no emission token to sell, and no rate that moves because someone voted.",
    note: "Simple interest. It does not compound inside the shaft.",
  },
  {
    n: "03",
    title: "Lift",
    body: "Pull accrued coupon on any day of the term without touching the lock. Principal comes up on the date. Abandon early and you forfeit unclaimed coupon at the seam's published rate — the principal is never the penalty.",
    note: "Claimed coupon is yours even if you abandon the shaft later.",
  },
] as const;

const MARKS = [0.02, 0.54, 1];

export function Working() {
  const [step, setStep] = useState(0);
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>("[data-step]").forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 60%",
          end: "bottom 60%",
          onToggle: (self) => {
            if (self.isActive) setStep(i);
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="working" className="border-y border-[var(--rule)] bg-[#080809]">
      <div className="mx-auto max-w-[1280px] px-4 py-24 lg:px-12 lg:py-32">
        <Head
          index="02"
          meta="Sink · Accrue · Lift"
          title={
            <>
              The shaft is the <span className="text-flux">product</span>.
            </>
          }
          lead="Not a strategy, not a vault that reallocates overnight. A term, a rate, and a token that proves both."
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:h-fit lg:self-start">
            <Plate step={step} />
          </div>

          <ol ref={listRef} className="relative">
            {STEPS.map((s, i) => (
              <li key={s.n} data-step className="flex min-h-[58vh] flex-col justify-center border-b border-[var(--rule)] py-12">
                <div className="flex items-baseline gap-4">
                  <span className={cn("num text-[10px] tracking-[0.3em] transition-colors", i === step ? "text-flux" : "text-bone-3")}>
                    {s.n}
                  </span>
                  <span className="h-px flex-1 bg-[var(--rule)]" />
                </div>
                <h3
                  className={cn(
                    "display mt-6 text-[clamp(2rem,4.4vw,3.2rem)] transition-colors duration-500",
                    i === step ? "text-bone" : "text-bone-3",
                  )}
                >
                  {s.title}
                </h3>
                <p className="mt-5 max-w-lg text-[0.95rem] leading-relaxed text-bone-2">{s.body}</p>
                <p className="num mt-5 text-[10px] uppercase tracking-[0.14em] text-bone-3">→ {s.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function Plate({ step }: { step: number }) {
  const token = getToken("usdt");
  const [progress, setProgress] = useState(MARKS[0]);
  const seam = SEAMS[1];

  useEffect(() => {
    const state = { p: progress };
    const tween = gsap.to(state, {
      p: MARKS[step] ?? 0,
      duration: 1.1,
      ease: "power3.inOut",
      onUpdate: () => setProgress(state.p),
    });
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const accrued = FULL * progress;
  const lifted = step >= 2 ? accrued : 0;
  const day = Math.round(DAYS * progress);

  return (
    <div>
      <div className="panel ticked bg-[#0b0b0c]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] p-4">
          <div className="flex items-center gap-3">
            <TokenMark id={token.id} symbol={token.symbol} size={34} />
            <div>
              <p className="num text-xs">SHAFT #0042</p>
              <p className="num mt-1 text-[10px] text-bone-3">
                {seam.name.toUpperCase()} · {DAYS} D
              </p>
            </div>
          </div>
          <span
            className="num px-2 py-1 text-[9px] uppercase tracking-[0.16em]"
            style={{
              color: step >= 2 ? "#0b0b0c" : seam.color,
              background: step >= 2 ? seam.color : "transparent",
              border: `1px solid ${seam.color}`,
            }}
          >
            {step === 0 ? "Sunk" : step === 1 ? "Accruing" : "Liftable"}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_128px]">
          <div className="p-4">
            <p className="tag">Coupon accrued</p>
            <p className="num mt-2 text-2xl" style={{ color: seam.color }}>
              {formatTokenAmount(accrued, token.symbol)}
            </p>
            <p className="num mt-1.5 text-[10px] text-bone-3">
              DAY {String(day).padStart(2, "0")} OF {DAYS}
            </p>
            <div className="mt-5">
              <Meter value={progress} color={seam.color} />
            </div>
            <dl className="mt-4">
              <Row label="Principal" value={formatUsd(PRINCIPAL, 0)} />
              <Row label="At maturity" value={formatTokenAmount(FULL, token.symbol)} />
              <Row
                label="Lifted"
                value={formatTokenAmount(lifted, token.symbol)}
                accent={step >= 2 ? seam.color : undefined}
              />
            </dl>
          </div>

          {/* the sample itself — the only 3D on the sheet */}
          <div className="relative border-l border-[var(--rule)] bg-[#060607]">
            <CoreSample className="absolute inset-0" />
            <span className="num absolute bottom-2 left-0 right-0 text-center text-[8px] tracking-[0.2em] text-bone-3">
              CORE 042
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-1">
        {STEPS.map((s, i) => (
          <span
            key={s.n}
            className="h-px flex-1 transition-colors duration-500"
            style={{ background: i <= step ? seam.color : "var(--rule)" }}
          />
        ))}
      </div>
    </div>
  );
}
