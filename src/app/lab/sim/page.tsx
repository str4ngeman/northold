"use client";

import { LabPage } from "@/components/lab/ui";
import { Surface } from "@/components/ui/surface";

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
  return (
    <LabPage
      kicker="Simulate"
      title="Walk a lock through time"
      body="Time-travel sims are Foundry tests now. Run npm run contracts:test. Sepolia cannot warp."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {SCENARIOS.map((s) => (
          <Surface key={s.id} className="flex flex-col p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">{s.id}</p>
            <h2 className="mt-2 text-xl font-semibold">{s.title}</h2>
            <p className="mt-2 flex-1 text-sm text-[var(--ink-2)]">{s.body}</p>
          </Surface>
        ))}
      </div>
    </LabPage>
  );
}
