"use client";

import { LabPage, LogPane } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { useLabExec } from "@/hooks/use-lab-exec";

const SCENARIOS = [
  {
    id: "lifecycle",
    title: "Pulse lifecycle",
    body: "Mint 1,000 USDT, warp 15 days, claim the coupon, warp to maturity, unlock principal.",
  },
  {
    id: "emergency",
    title: "Emergency break",
    body: "Mint, warp 10 days, exit early. Fee taken, coupon forfeited.",
  },
  {
    id: "claims",
    title: "Claim stream",
    body: "Six 5-day steps across a Pulse lock. Coupons should sum to the 30-day cap.",
  },
] as const;

export default function LabSimPage() {
  const { lines, running, run } = useLabExec();

  return (
    <LabPage
      kicker="Simulate"
      title="Walk a lock through time"
      body="Anvil account #1 is the user. The tool mints mock USDT, then warps the chain."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {SCENARIOS.map((s) => (
          <Surface key={s.id} className="flex flex-col p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">{s.id}</p>
            <h2 className="mt-2 text-xl font-semibold">{s.title}</h2>
            <p className="mt-2 flex-1 text-sm text-[var(--ink-2)]">{s.body}</p>
            <div className="mt-5">
              <CtaButton disabled={running} onClick={() => void run("sim", [s.id])}>
                Run {s.id}
              </CtaButton>
            </div>
          </Surface>
        ))}
      </div>
      <div className="mt-6">
        <LogPane lines={lines} running={running} />
      </div>
    </LabPage>
  );
}
