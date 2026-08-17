"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Compass, Lock, Sunrise } from "lucide-react";

import { CompassMark } from "@/components/brand/mark";
import { TokenMark } from "@/components/brand/token-mark";
import { PlanCard } from "@/components/dashboard/plan-card";
import { PositionCard } from "@/components/dashboard/position-card";
import { CtaButton } from "@/components/ui/cta-button";
import { FadeIn } from "@/components/motion";
import { Surface } from "@/components/ui/surface";
import { BRAND } from "@/lib/brand";
import { getPlan, getToken, materializeSeeds } from "@/lib/dummy";
import { formatApy, formatUsd } from "@/lib/format";
import { buildPositionView, dailyUsdt, projectedUsdt } from "@/lib/math";
import type { Plan } from "@/lib/types";

export function HomeView({ plans }: { plans: Plan[] }) {
  const now = useMemo(() => Date.now(), []);
  const preview = useMemo(
    () =>
      materializeSeeds(now).map((p) => buildPositionView(p, getToken(p.assetId), getPlan(p.planId), now)),
    [now],
  );

  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:py-20">
        <FadeIn>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--light)]">
            {BRAND.tagline}
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Capital takes a bearing and stays.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--ink-2)]">
            Deposit USDT, USDC, ETH or BTC. The position NFT is the hold. Yield lands in USDT and never
            compounds unless you lock again — simple on purpose.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaButton href="/app/stake">Open a hold</CtaButton>
            <CtaButton href="/plans" variant="ghost">
              Compare bearings
            </CtaButton>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-xs text-[var(--ink-2)]">
            {["Claim any time", "Same-token principal", "Early exit if you must"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/8">
                <CompassMark size={12} className="text-[var(--gain)]" />
                {item}
              </span>
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={0.12} className="relative h-[420px]">
          <CompassMark
            size={280}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--light)] opacity-[0.07]"
          />
          {preview.map((view, i) => (
            <motion.div
              key={view.tokenId}
              className="absolute w-[min(100%,320px)]"
              style={{ left: i * 18, top: i * 28, zIndex: 3 - i }}
              animate={{ y: [0, i % 2 === 0 ? -8 : 8, 0] }}
              transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
            >
              <PositionCard view={view} />
            </motion.div>
          ))}
        </FadeIn>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 lg:px-10">
        <FadeIn>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">The hold</p>
          <h2 className="mt-2 max-w-xl text-3xl font-semibold">True north is the date. Everything else is light.</h2>
        </FadeIn>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "A bearing, not a bet",
              body: "You pick a lock. The coupon is frozen at mint. The card is the stake until that date.",
            },
            {
              title: "Principal stays home",
              body: "What you lock comes back in the same token. ETH in, ETH out. USDT yield on top.",
            },
            {
              title: "Claim on your clock",
              body: "USDT accrues in the open. Pull it any day. Unclaimed coupon is forfeited only on emergency exit.",
            },
          ].map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.08}>
              <Surface className="h-full p-6">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--light)]">0{i + 1}</p>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--ink-2)]">{item.body}</p>
              </Surface>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 lg:px-10">
        <YieldPlayground plans={plans} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-10">
        <FadeIn>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold">Three steps. Then it holds.</h2>
        </FadeIn>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Compass, title: "Choose an asset", body: "Stables if you want calm. ETH or BTC if you want that asset back later." },
            { icon: Lock, title: "Set a bearing", body: "Watch, Bearing, or Meridian. Longer holds pay a fatter USDT coupon." },
            { icon: Sunrise, title: "Collect the light", body: "USDT accrues while the lock is closed. Claim whenever. Principal waits for the date." },
          ].map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.08}>
              <Surface className="h-full p-6">
                <step.icon className="size-8 text-[var(--light)]" />
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-[var(--ink-2)]">{step.body}</p>
              </Surface>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-10">
        <FadeIn>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">Bearings</p>
          <h2 className="mt-2 text-3xl font-semibold">Pick the north you can keep.</h2>
        </FadeIn>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} highlight={plan.id === "horizon"} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center lg:px-10">
        <FadeIn>
          <h2 className="text-3xl font-semibold">Idle capital has no bearing.</h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--ink-2)]">
            Open a hold in about a minute. Claim the USDT tomorrow if you want to see the light move.
          </p>
          <div className="mt-6">
            <CtaButton href="/app/stake">Set your first hold</CtaButton>
          </div>
        </FadeIn>
      </section>
    </main>
  );
}

function YieldPlayground({ plans }: { plans: Plan[] }) {
  const [usd, setUsd] = useState(1000);
  const [planId, setPlanId] = useState(plans[1]?.id ?? plans[0]?.id ?? "horizon");
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  if (!plan) return null;
  const earned = projectedUsdt(usd, plan.apyBps, plan.lockSeconds);
  const daily = dailyUsdt(usd, plan.apyBps);

  return (
    <Surface className="grid gap-8 p-6 md:grid-cols-[1.1fr_.9fr] md:p-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">Chart the coupon</p>
        <h2 className="mt-2 text-2xl font-semibold">What would ${usd.toLocaleString()} collect?</h2>
        <input
          type="range"
          min={100}
          max={10000}
          step={50}
          value={usd}
          onChange={(e) => setUsd(Number(e.target.value))}
          className="mt-6 w-full accent-[var(--light)]"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {plans.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPlanId(item.id)}
              className={`rounded-full px-4 py-2 text-sm ${
                item.id === plan.id ? "bg-[var(--light)] text-[#16120a]" : "bg-white/5 text-[var(--ink-2)]"
              }`}
            >
              {item.name} · {formatApy(item.apyBps)}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[1.5rem] bg-black/20 p-6">
        <p className="text-sm text-[var(--ink-3)]">USDT by the date</p>
        <p className="num mt-2 text-4xl font-semibold text-[var(--gain)]">{formatUsd(earned)}</p>
        <p className="mt-2 text-sm text-[var(--ink-2)]">{formatUsd(daily)} every day while it holds</p>
        <div className="mt-6 flex items-center gap-2 text-sm text-[var(--ink-2)]">
          <TokenMark id="usdt" symbol="USDT" size={28} />
          Paid in USDT. Principal stays in the token you deposited.
        </div>
        <div className="mt-6">
          <CtaButton href={`/app/stake?plan=${plan.id}`} className="w-full">
            Hold {formatUsd(usd, 0)} on {plan.name}
          </CtaButton>
        </div>
      </div>
    </Surface>
  );
}
