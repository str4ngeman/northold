import Link from "next/link";
import { Clock, ShieldAlert, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { HeroCards } from "@/components/hero-cards";
import { PLANS } from "@/lib/dummy";
import { formatApy, formatFee, formatLock, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16">
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="font-display text-xs tracking-[0.35em] text-primary uppercase">
            Position NFTs
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
            Your stake is a collectible.
            <span className="block text-primary">The card is the vault.</span>
          </h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            Deposit an ERC-20, pick a lock plan, and mint a Vault Card. That NFT{" "}
            <em>is</em> the investment — live USDT yield on the face, principal back in the
            same tokens when the seal completes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app/stake" className={cn(buttonVariants({ size: "lg" }))}>
              Mint your first card
            </Link>
            <Link href="/plans" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              View plans
            </Link>
          </div>
        </div>
        <HeroCards />
      </section>

      <section className="mt-24 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: "Mint, don’t just deposit",
            body: "Each stake becomes a numbered card with rarity from size and lock. Transfer later means selling the whole position.",
          },
          {
            icon: Clock,
            title: "USDT coupon, live",
            body: "Yield accrues in USDT and can be claimed anytime. Your principal stays in the token you deposited.",
          },
          {
            icon: ShieldAlert,
            title: "Emergency exit",
            body: "Break the seal early and pay a fee on principal. Unclaimed USDT is forfeited. Claimed yield stays yours.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-white/8 bg-card/60 p-5">
            <item.icon className="size-5 text-primary" />
            <h2 className="mt-3 font-medium">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Plans</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dummy APYs — swap these numbers when the treasury model is set.
            </p>
          </div>
          <Link href="/plans" className="text-sm text-primary hover:underline">
            All details
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Link
              key={plan.id}
              href="/app/stake"
              className="rounded-2xl border border-white/8 bg-card/60 p-5 transition-colors hover:border-primary/40"
            >
              <p className="font-display text-xl">{plan.name}</p>
              <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              <p className="mt-4 text-2xl text-primary">{formatApy(plan.apyBps)}</p>
              <dl className="mt-4 space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Lock</dt>
                  <dd className="text-foreground">{formatLock(plan.lockSeconds)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Range</dt>
                  <dd className="text-foreground">
                    {formatUsd(plan.minUsd, 0)}–{formatUsd(plan.maxUsd, 0)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Emergency fee</dt>
                  <dd className="text-foreground">{formatFee(plan.emergencyFeeBps)}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
