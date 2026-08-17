import Link from "next/link";
import { Sparkles } from "lucide-react";

import { CtaButton } from "@/components/ui/cta-button";
import { Hint } from "@/components/ui/hint";
import { Surface } from "@/components/ui/surface";
import { formatApy, formatFee, formatLock, formatUsd } from "@/lib/format";
import { dailyUsdt, projectedUsdt } from "@/lib/math";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlanCard({
  plan,
  highlight,
  sampleUsd = 1000,
}: {
  plan: Plan;
  highlight?: boolean;
  sampleUsd?: number;
}) {
  const earned = projectedUsdt(sampleUsd, plan.apyBps, plan.lockSeconds);
  const daily = dailyUsdt(sampleUsd, plan.apyBps);

  return (
    <Surface hover className={cn("relative flex h-full flex-col p-6", highlight && "ring-[var(--light)]/35")}>
      {highlight && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-[var(--light)] px-3 py-1 text-[11px] font-semibold text-[#16120a]">
          <Sparkles className="size-3" /> True bearing
        </span>
      )}
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-3)]">{formatLock(plan.lockSeconds)}</p>
      <h3 className="mt-2 text-2xl font-semibold">{plan.name}</h3>
      <p className="mt-2 text-sm text-[var(--ink-2)]">{plan.tagline}</p>
      <p className="num mt-5 text-4xl font-semibold text-[var(--light)]">{formatApy(plan.apyBps)}</p>
      <p className="mt-2 text-sm text-[var(--gain)]">
        About {formatUsd(earned)} USDT on a {formatUsd(sampleUsd, 0)} lock
      </p>
      <dl className="mt-5 space-y-2 text-sm text-[var(--ink-2)]">
        <div className="flex justify-between">
          <dt>Range</dt>
          <dd>{formatUsd(plan.minUsd, 0)}–{formatUsd(plan.maxUsd, 0)}</dd>
        </div>
        <div className="flex justify-between">
          <Hint text="Taken from principal only if you exit before the lock ends. Claimed USDT is yours.">
            <dt>Early exit</dt>
          </Hint>
          <dd>{formatFee(plan.emergencyFeeBps)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Daily on $1k</dt>
          <dd className="text-[var(--gain)]">{formatUsd(daily)}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <CtaButton href={`/app/stake?plan=${plan.id}`} className="w-full">
          Hold {plan.name}
        </CtaButton>
      </div>
    </Surface>
  );
}

export function PlanStrip({ plans }: { plans: Plan[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} highlight={plan.id === "horizon"} />
      ))}
    </div>
  );
}

export function MiniPlanLink({ plan }: { plan: Plan }) {
  return (
    <Link href={`/app/stake?plan=${plan.id}`} className="text-[var(--light)] underline-offset-4 hover:underline">
      {plan.name}
    </Link>
  );
}
