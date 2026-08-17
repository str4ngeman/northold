import Link from "next/link";

import { Bloom } from "@/components/kinetic/bloom";
import { HeroCards } from "@/components/hero-cards";
import { LetterButton } from "@/components/kinetic/letter-button";
import { Marquee } from "@/components/kinetic/marquee";
import { Reveal } from "@/components/kinetic/reveal";
import { StrokeFrame } from "@/components/kinetic/stroke-frame";
import { TunnelLines } from "@/components/kinetic/tunnel-lines";
import { PLANS } from "@/lib/dummy";
import { formatApy, formatFee, formatLock, formatUsd } from "@/lib/format";
import { loadCatalog } from "@/lib/load-catalog";

export default async function HomePage() {
  let plans = PLANS;
  try {
    const catalog = await loadCatalog();
    if (catalog.plans.length) plans = catalog.plans;
  } catch {
    /* local mongo may be down during first paint */
  }
  return (
    <main>
      <section className="section section--tall">
        <Bloom className="hero-bloom" data-welcome="bloom" />
        <div className="container" style={{ position: "relative" }}>
          <p className="label">Position NFTs</p>
          <h1 className="display hero-copy">
            <span className="reveal__line">
              <span className="reveal__inner" data-welcome="title">
                The card is the stake.
              </span>
            </span>
          </h1>
          <p className="body hero-body">
            An ERC-20 lock mints a numbered NFT. USDT accrues on the face. Principal returns in
            the same tokens when the seal completes.
          </p>
          <div className="hero-cta">
            <LetterButton href="/app/stake" label="Mint a card" welcome="button" />
            <LetterButton href="/plans" label="Read plans" variant="ghost" welcome="button" />
          </div>
        </div>
        <div data-welcome="marquee" style={{ marginTop: "var(--s-7)" }}>
          <Marquee speed={32}>
            <span>Pulse</span>
            <span>Horizon</span>
            <span>Apex</span>
            <span>Vault card</span>
            <span>USDT coupon</span>
            <span>Same-token principal</span>
          </Marquee>
        </div>
      </section>

      <section className="section section--tall">
        <div className="container split">
          <div>
            <p className="label">Object</p>
            <Reveal as="h2" className="h2 hero-copy">
              Mint the position as an object
            </Reveal>
            <Reveal as="p" className="body hero-body" delay={80}>
              Holding the card is holding the lock. A later transfer sells the whole sealed
              position.
            </Reveal>
            <div style={{ marginTop: "var(--s-6)" }}>
              <LetterButton href="/app/stake" label="Mint a card" />
            </div>
          </div>
          <div className="object-stage">
            <HeroCards />
            <StrokeFrame w={720} h={280} cap="right" className="object-frame" />
          </div>
        </div>
      </section>

      <section className="section section--tall" style={{ overflow: "clip" }}>
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <p className="label">Coupon</p>
          <Reveal as="h2" className="h2 hero-copy">
            USDT accrues in open time
          </Reveal>
          <Reveal as="p" className="body hero-body" delay={80}>
            Claim the coupon without moving principal. Break the seal early and a fee is taken
            from the deposited tokens.
          </Reveal>
        </div>
        <div className="coupon-tunnel tunnel--desk">
          <TunnelLines />
        </div>
        <Bloom className="coupon-bloom" />
      </section>

      <section className="section">
        <div className="container">
          <p className="label">Plans</p>
          <Reveal as="h2" className="h2 hero-copy">
            Three locks. One coupon asset.
          </Reveal>
          <div className="plans-grid">
            {plans.map((plan) => (
              <Link key={plan.id} href="/app/stake" data-hover="true">
                <p className="label">{formatLock(plan.lockSeconds)}</p>
                <p className="h3" style={{ marginTop: "0.8rem" }}>
                  {plan.name}
                </p>
                <p style={{ color: "var(--light)", marginTop: "1.2rem", fontSize: "var(--fs-h3)" }}>
                  {formatApy(plan.apyBps)}
                </p>
                <p className="body" style={{ marginTop: "1rem", fontSize: "var(--fs-small)" }}>
                  {formatUsd(plan.minUsd, 0)}–{formatUsd(plan.maxUsd, 0)} · fee{" "}
                  {formatFee(plan.emergencyFeeBps)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tall cta-band">
        <TunnelLines className="tunnel--desk" />
        <Bloom className="cta-bloom" />
        <div className="container" style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <p className="label">Seal</p>
          <Reveal as="h2" className="h2 hero-copy">
            Seal a numbered plate
          </Reveal>
          <p className="body hero-body" style={{ marginInline: "auto" }}>
            Dummy rates. The object model is the product.
          </p>
          <div style={{ marginTop: "var(--s-6)" }}>
            <LetterButton href="/app/stake" label="Mint a card" />
          </div>
        </div>
      </section>
    </main>
  );
}
