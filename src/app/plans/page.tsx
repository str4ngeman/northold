import { LetterButton } from "@/components/kinetic/letter-button";
import { Reveal } from "@/components/kinetic/reveal";
import { StrokeFrame } from "@/components/kinetic/stroke-frame";
import { PLANS } from "@/lib/dummy";
import { formatApy, formatFee, formatLock, formatUsd } from "@/lib/format";
import { loadCatalog } from "@/lib/load-catalog";

export default async function PlansPage() {
  let plans = PLANS;
  try {
    const catalog = await loadCatalog();
    if (catalog.plans.length) plans = catalog.plans;
  } catch {
    /* ignore */
  }

  return (
    <main className="page">
      <div className="container" style={{ position: "relative" }}>
        <p className="label">Plans</p>
        <Reveal as="h1" className="h2 hero-copy">
          Lock, coupon, emergency seal
        </Reveal>
        <Reveal as="p" className="body hero-body" delay={60}>
          Each plan sets a USD range, a lock duration, a USDT coupon, and a fee if the seal is broken early.
        </Reveal>
        <StrokeFrame w={1100} h={220} cap="left" className="object-frame" />

        <div className="plans-grid" style={{ marginTop: "var(--s-7)" }}>
          {plans.map((plan) => (
            <article key={plan.id} className="glass" style={{ padding: "2rem 1.4rem" }}>
              <p className="label">{formatLock(plan.lockSeconds)}</p>
              <h2 className="h3" style={{ marginTop: "0.8rem" }}>
                {plan.name}
              </h2>
              <p className="body" style={{ marginTop: "0.6rem", fontSize: "var(--fs-small)" }}>
                {plan.tagline}
              </p>
              <p style={{ color: "var(--light)", marginTop: "1.4rem", fontSize: "var(--fs-h2)" }}>
                {formatApy(plan.apyBps)}
              </p>
              <dl style={{ marginTop: "1.4rem" }}>
                <div className="stat">
                  <dt>Minimum</dt>
                  <dd>{formatUsd(plan.minUsd, 0)}</dd>
                </div>
                <div className="stat">
                  <dt>Maximum</dt>
                  <dd>{formatUsd(plan.maxUsd, 0)}</dd>
                </div>
                <div className="stat">
                  <dt>Emergency fee</dt>
                  <dd>{formatFee(plan.emergencyFeeBps)} of principal</dd>
                </div>
              </dl>
              <div style={{ marginTop: "1.6rem" }}>
                <LetterButton href="/app/stake" label={`Mint ${plan.name}`} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
