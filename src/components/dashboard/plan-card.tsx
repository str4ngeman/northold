"use client";

import Link from "next/link";
import { ArrowDown } from "lucide-react";

import { Counter, Row } from "@/components/kit";
import { formatFee, formatUsd } from "@/lib/format";
import { projectedUsd } from "@/lib/math";
import { seamOf } from "@/lib/seams";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One seam, described the way the sheet describes it: index, depth band,
 * grade, and the four numbers that actually bind.
 */
export function SeamCard({
  plan,
  sampleUsd = 10_000,
  className,
}: {
  plan: Plan;
  sampleUsd?: number;
  className?: string;
}) {
  const seam = seamOf(plan.id, plan.lockSeconds);
  const days = Math.round(plan.lockSeconds / 86400);
  const sample = projectedUsd(sampleUsd, plan.apyBps, plan.lockSeconds);

  return (
    <article className={cn("group relative flex h-full flex-col bg-[#0b0b0c] p-7", className)}>
      <span
        className="absolute inset-x-0 top-0 h-[3px] opacity-50 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: seam.color }}
      />

      <div className="flex items-baseline justify-between gap-3">
        <span className="tag" style={{ color: seam.color }}>
          Seam {seam.index}
        </span>
        <span className="num text-[10px] text-bone-3">{seam.depth}</span>
      </div>

      <h3 className="display mt-5 text-[2.6rem]" style={{ color: seam.color }}>
        {seam.name}
      </h3>
      <p className="mt-3 max-w-xs text-[0.86rem] leading-relaxed text-bone-2">{seam.tagline}</p>

      <div className="mt-9 flex items-end gap-2">
        <Counter
          value={plan.apyBps}
          format={(n) => (n / 100).toFixed(2)}
          className="text-[3.6rem] leading-[0.85] tracking-[-0.05em]"
        />
        <span className="num pb-1.5 text-lg text-bone-2">%</span>
      </div>
      <p className="tag mt-3">Coupon, struck at mint</p>

      <dl className="mt-8">
        <Row label="Term" value={`${days} days`} />
        <Row label="Matrix" value={seam.matrix} />
        <Row label="Stake" value={`${formatUsd(plan.minUsd, 0)} – ${formatUsd(plan.maxUsd, 0)}`} />
        <Row label="Abandon fee" value={formatFee(plan.emergencyFeeBps)} />
        <Row label={`On ${formatUsd(sampleUsd, 0)}`} value={formatUsd(sample, 0)} accent={seam.color} />
      </dl>

      <p className="mt-6 text-[0.8rem] leading-relaxed text-bone-3">{seam.note}</p>

      <Link href={`/app/stake?plan=${plan.id}`} className="act act-line mt-8 w-full">
        <span>Sink to {seam.name}</span>
        <ArrowDown className="size-3.5" />
      </Link>
    </article>
  );
}

/** Legacy name kept so nothing outside this file has to care. */
export const PlanCard = SeamCard;

export function PlanStrip({ plans }: { plans: Plan[] }) {
  return (
    <div className="grid gap-px bg-[var(--rule)] md:grid-cols-3">
      {plans.map((plan) => (
        <SeamCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}

export function MiniPlanLink({ plan }: { plan: Plan }) {
  const seam = seamOf(plan.id, plan.lockSeconds);
  return (
    <Link href={`/app/stake?plan=${plan.id}`} className="underline-offset-4 hover:underline" style={{ color: seam.color }}>
      {seam.name}
    </Link>
  );
}
