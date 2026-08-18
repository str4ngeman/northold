import { PlanCard } from "@/components/dashboard/plan-card";
import { FadeIn } from "@/components/motion";
import { PLANS } from "@/lib/dummy";
import { loadCatalog } from "@/lib/load-catalog";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  let plans = PLANS;
  try {
    const catalog = await loadCatalog();
    const live = catalog.plans.filter((plan) => plan.active !== false);
    if (live.length) plans = live;
  } catch {
    /* ignore */
  }

  return (
    <main className="mx-auto max-w-6xl py-4">
      <FadeIn>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">Bearings</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight">
          Pick a north you can keep.
        </h1>
        <p className="mt-4 max-w-xl text-[var(--ink-2)]">
          Every bearing pays a coupon in the token you lock. Principal returns in that same token.
          Emergency exit is there if you need it — with a fee, so the hold stays honest.
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} highlight={plan.id === "horizon"} />
        ))}
      </div>
    </main>
  );
}
