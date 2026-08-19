"use client";

import Link from "next/link";
import { ArrowDown } from "lucide-react";

import { Counter, Lift, Wipe } from "@/components/kit";
import { SectionCut } from "@/components/home/section-cut";
import { SITES } from "@/lib/field/world";
import type { Plan } from "@/lib/types";

export function Hero({ plans }: { plans: Plan[] }) {
  const top = Math.max(...plans.map((plan) => plan.apyBps));
  const terms = plans.map((plan) => Math.round(plan.lockSeconds / 86400)).join(" / ");

  return (
    <section className="relative border-b border-[var(--rule)]">
      <div className="graticule pointer-events-none absolute inset-0 opacity-70" />

      {/* spine label, the way a plan chest is labelled on its edge */}
      <span className="num pointer-events-none absolute -left-px top-1/2 hidden -translate-y-1/2 -rotate-90 whitespace-nowrap text-[9px] uppercase tracking-[0.5em] text-bone-3 xl:block">
        Northold Field Survey · Sheet 01
      </span>

      <div className="relative mx-auto max-w-[1280px] px-4 pb-4 pt-16 lg:px-12 lg:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_.75fr] lg:gap-16">
          <div>
            <Wipe className="flex items-center gap-3">
              <span className="size-1.5 bg-flux seep" />
              <span className="tag">Fixed-term deposits, assayed</span>
            </Wipe>

            <Lift
              as="h1"
              className="display mt-8 text-[clamp(3rem,9vw,6.5rem)]"
              delay={0.05}
            >
              Every deposit is a depth.
            </Lift>

            <Wipe delay={0.3}>
              <p className="mt-8 max-w-xl text-[1.02rem] leading-relaxed text-bone-2">
                Northold books capital against a seam. Choose how far down you are willing to go — thirty days, ninety,
                a hundred and eighty — and the coupon is struck at that depth and never moves again. It pays in the
                asset you sank. The shaft itself is a token you hold, transfer, or sell.
              </p>
            </Wipe>

            <Wipe delay={0.42} className="mt-10 flex flex-wrap items-center gap-2">
              <Link href="/app/stake" className="act act-solid px-7">
                <span>Sink a shaft</span>
                <ArrowDown className="size-3.5" />
              </Link>
              <Link href="/universe" className="act act-line px-7">
                <span>Walk the field</span>
              </Link>
            </Wipe>
          </div>

          <Wipe delay={0.2} className="lg:pt-6">
            <div className="border-t border-[var(--rule)]">
              <Stat k="Top grade" v={<Counter value={top} format={(n) => `${(n / 100).toFixed(2)} %`} />} lit />
              <Stat k="Terms open" v={<span className="num">{terms} d</span>} />
              <Stat k="Settlement" v={<span className="num">Same asset</span>} />
              <Stat k="Surveyed" v={<Counter value={SITES.length} format={(n) => `${Math.round(n)} sites`} />} />
            </div>
            <p className="mt-6 text-[0.82rem] leading-relaxed text-bone-3">
              Coupons are simple interest, struck at mint, denominated in the deposited asset. Nothing rebases, nothing
              is paid in a second token, and nothing about the rate is a vote.
            </p>
          </Wipe>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 pb-16 lg:px-12 lg:pb-20">
        <Wipe delay={0.1}>
          <SectionCut plans={plans} />
        </Wipe>
      </div>
    </section>
  );
}

function Stat({ k, v, lit }: { k: string; v: React.ReactNode; lit?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-3.5">
      <span className="tag">{k}</span>
      <span className={`text-[0.95rem] ${lit ? "text-flux" : "text-bone"}`}>{v}</span>
    </div>
  );
}
