"use client";

import Link from "next/link";
import { ArrowDown } from "lucide-react";

import { Lift, Wipe } from "@/components/kit";
import { SEAMS } from "@/lib/seams";

export function Closing() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--rule)]">
      <div className="graticule-fine pointer-events-none absolute inset-0 opacity-60" />

      {/* the three seams, run out flat as a footer band */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-40 flex-col justify-end">
        {SEAMS.map((seam, i) => (
          <span
            key={seam.slug}
            className="w-full"
            style={{ height: 6 + i * 10, background: seam.color, opacity: 0.14 + i * 0.06 }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-[1280px] flex-col items-center px-4 py-28 text-center lg:px-12 lg:py-36">
        <Wipe>
          <p className="tag">Open ground</p>
        </Wipe>
        <Lift as="h2" className="display mt-7 max-w-4xl text-[clamp(2.6rem,8vw,5.6rem)]">
          Pick a depth. Leave it alone.
        </Lift>
        <Wipe delay={0.16}>
          <p className="mt-7 max-w-lg text-[0.98rem] leading-relaxed text-bone-2">
            Thirty days is enough to see the mechanism work. A hundred and eighty is enough to make it worth doing. Both
            pay in the asset you brought.
          </p>
        </Wipe>
        <Wipe delay={0.26} className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <Link href="/app/stake" className="act act-solid px-8">
            <span>Sink your first shaft</span>
            <ArrowDown className="size-3.5" />
          </Link>
          <Link href="/plans" className="act act-line px-8">
            <span>Compare the seams</span>
          </Link>
        </Wipe>
        <p className="num mt-12 max-w-md text-[10px] leading-relaxed tracking-[0.14em] text-bone-3">
          COUPONS ARE FIXED AT MINT AND PAID IN THE DEPOSITED ASSET. SMART CONTRACTS CARRY RISK. NOTHING HERE IS
          FINANCIAL ADVICE.
        </p>
      </div>
    </section>
  );
}
