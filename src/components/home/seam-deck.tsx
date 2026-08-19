"use client";

import { Belt, DepthRule, Head, Wipe } from "@/components/kit";
import { SeamCard } from "@/components/dashboard/plan-card";
import { TokenMark } from "@/components/brand/token-mark";
import { TOKENS } from "@/lib/dummy";
import { formatUsd } from "@/lib/format";
import type { Plan } from "@/lib/types";

export function AssetBelt() {
  const run = (
    <div className="flex items-center">
      {TOKENS.map((token) => (
        <span key={token.id} className="flex shrink-0 items-center gap-3 px-7 py-3.5">
          <TokenMark id={token.id} symbol={token.symbol} size={22} />
          <span className="num text-[11px] tracking-[0.14em]">{token.symbol}</span>
          <span className="num text-[10px] text-bone-3">
            {token.priceUsd >= 100 ? formatUsd(token.priceUsd, 0) : formatUsd(token.priceUsd)}
          </span>
        </span>
      ))}
      <span className="num shrink-0 px-7 text-[10px] uppercase tracking-[0.3em] text-flux">
        In as it was · Out as it was
      </span>
    </div>
  );

  return (
    <div className="border-b border-[var(--rule)] bg-[#080809]">
      <Belt speed={38}>{run}</Belt>
    </div>
  );
}

export function SeamDeck({ plans }: { plans: Plan[] }) {
  return (
    <section id="seams" className="mx-auto max-w-[1280px] px-4 py-24 lg:px-12 lg:py-32">
      <Head
        index="01"
        meta={`${plans.length} seams open`}
        title={
          <>
            Three depths. One <span className="text-flux">trade</span>.
          </>
        }
        lead="Further down is further from your money and closer to a real coupon. That is the entire mechanism, and it is the only thing you are asked to decide."
      />

      <div className="mt-16 grid gap-10 lg:grid-cols-[92px_1fr] lg:gap-14">
        <Wipe className="hidden lg:block">
          <p className="tag mb-6">Depth</p>
          <DepthRule height={420} />
        </Wipe>

        <div className="grid gap-px bg-[var(--rule)] lg:grid-cols-3">
          {plans.map((plan, i) => (
            <Wipe key={plan.id} delay={i * 0.08} className="bg-[#0b0b0c]">
              <SeamCard plan={plan} />
            </Wipe>
          ))}
        </div>
      </div>
    </section>
  );
}
