import { SeamCard } from "@/components/dashboard/plan-card";
import { DepthRule, Head, Wipe } from "@/components/kit";
import { SectionCut } from "@/components/home/section-cut";
import { PLANS } from "@/lib/dummy";
import { loadCatalog } from "@/lib/load-catalog";
import { SEAMS } from "@/lib/seams";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Seams — Northold",
  description: "Three depths, three coupons. Pick how far down you are willing to go.",
};

const NOTES = [
  {
    q: "What does the coupon actually pay in?",
    a: "The asset you deposited. WETH pays WETH, USDC pays USDC. There is no second token and no swap at either end.",
  },
  {
    q: "Can the rate change after I sink?",
    a: "No. The coupon is written into the position at mint. Governance can open new seams at different rates, but it cannot reach into an open shaft.",
  },
  {
    q: "What happens if I need out early?",
    a: "You abandon the shaft. Principal comes back, minus nothing — the fee is taken from unclaimed coupon at the rate published on the seam. Coupon you already lifted stays yours.",
  },
  {
    q: "Does it compound?",
    a: "No. Accrual is simple interest against the principal. If you want compounding, lift the coupon and sink it again.",
  },
];

export default async function SeamsPage() {
  let plans = PLANS;
  try {
    const catalog = await loadCatalog();
    const live = catalog.plans.filter((plan) => plan.active !== false);
    if (live.length) plans = live;
  } catch {
    /* mongo may be down; the defaults still describe the product */
  }

  return (
    <main className="mx-auto max-w-6xl pb-8">
      <Head
        index="Seams"
        meta={`${plans.length} open · datum to 2 400 m`}
        title={
          <>
            How far down are you <span className="text-flux">willing</span> to go?
          </>
        }
        lead="Depth is the only lever. Everything else about a Northold position — the asset, the settlement, the ownership — is identical across the three seams."
      />

      <Wipe delay={0.1} className="mt-14">
        <SectionCut plans={plans} compact />
      </Wipe>

      <div className="mt-16 grid gap-10 lg:grid-cols-[92px_1fr] lg:gap-14">
        <Wipe className="hidden lg:block">
          <p className="tag mb-6">Depth</p>
          <DepthRule height={420} />
        </Wipe>
        <div className="grid gap-px bg-[var(--rule)] md:grid-cols-3">
          {plans.map((plan, i) => (
            <Wipe key={plan.id} delay={i * 0.08} className="bg-[#0b0b0c]">
              <SeamCard plan={plan} />
            </Wipe>
          ))}
        </div>
      </div>

      <section className="mt-24">
        <div className="flex items-center gap-4">
          <span className="tag whitespace-nowrap">Standing questions</span>
          <span className="h-px flex-1 bg-[var(--rule)]" />
        </div>
        <div className="mt-8 grid gap-px bg-[var(--rule)] md:grid-cols-2">
          {NOTES.map((note) => (
            <div key={note.q} className="bg-[#0b0b0c] p-6">
              <p className="text-[0.95rem] font-medium">{note.q}</p>
              <p className="mt-3 text-[0.86rem] leading-relaxed text-bone-2">{note.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-[var(--rule)] pt-8">
        <p className="tag">Matrix reference</p>
        <div className="mt-5 grid gap-x-10 gap-y-3 sm:grid-cols-3">
          {SEAMS.map((seam) => (
            <div key={seam.slug} className="flex items-baseline gap-3">
              <span className="size-2 shrink-0 translate-y-[-1px]" style={{ background: seam.color }} />
              <p className="num text-[10px] leading-relaxed tracking-[0.1em] text-bone-3">
                {seam.index} · {seam.name.toUpperCase()} · {seam.depth} · {seam.matrix.toUpperCase()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
