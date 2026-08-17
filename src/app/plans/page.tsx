import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PLANS } from "@/lib/dummy";
import { formatApy, formatFee, formatLock, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function PlansPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <p className="font-display text-xs tracking-[0.35em] text-primary uppercase">Plans</p>
      <h1 className="mt-2 font-display text-4xl">Lock, coupon, and the emergency seal</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Every plan has a minimum and maximum in USD, a lock duration, a USDT APY, and an
        emergency fee. Rates below are placeholders for the frontend.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className="flex flex-col rounded-2xl border border-white/8 bg-card/70 p-6"
          >
            <h2 className="font-display text-3xl">{plan.name}</h2>
            <p className="text-sm text-muted-foreground">{plan.tagline}</p>
            <p className="mt-6 font-display text-4xl text-primary">{formatApy(plan.apyBps)}</p>
            <dl className="mt-6 space-y-3 text-sm">
              <Row label="Lock duration" value={formatLock(plan.lockSeconds)} />
              <Row label="Minimum" value={formatUsd(plan.minUsd, 0)} />
              <Row label="Maximum" value={formatUsd(plan.maxUsd, 0)} />
              <Row label="Emergency fee" value={`${formatFee(plan.emergencyFeeBps)} of principal`} />
              <Row label="Yield asset" value="USDT, claim anytime" />
              <Row label="Principal back" value="Same tokens you deposited" />
            </dl>
            <Link
              href="/app/stake"
              className={cn(buttonVariants(), "mt-8 w-full")}
            >
              Mint a {plan.name} card
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
