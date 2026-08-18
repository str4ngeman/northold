"use client";

import { useEffect, useState } from "react";

import { LabPage, LabStat, LogPane } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { useLabExec } from "@/hooks/use-lab-exec";
import { useLabState } from "@/hooks/use-lab-state";
import { formatUsd } from "@/lib/format";

type Catalog = {
  ok?: boolean;
  plans?: {
    id: number;
    slug: string;
    lockDays: number;
    apyBps: number;
    emergencyFeeBps: number;
    minUsd: number;
    maxUsd: number;
    active: boolean;
  }[];
  assets?: { symbol: string; address: string; priceUsd: number }[];
};

type Snapshot = {
  ok?: boolean;
  snapshot?: {
    cardsMinted: number;
    tvlUsd: number;
    treasury?: { symbol: string; amount: string }[];
    referralBps: number;
  };
};

export default function LabChainPage() {
  const { state, refresh } = useLabState(4000);
  const { lines, running, run } = useLabExec();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  async function reloadViews() {
    const [c, s] = await Promise.all([fetch("/api/lab/catalog"), fetch("/api/lab/snapshot")]);
    setCatalog((await c.json()) as Catalog);
    setSnap((await s.json()) as Snapshot);
  }

  useEffect(() => {
    void reloadViews();
  }, [state?.connected, state?.deployment?.timestamp]);

  async function act(cmd: string, args: string[] = []) {
    await run(cmd, args);
    await refresh();
    await reloadViews();
  }

  const live = Boolean(state?.connected);

  return (
    <LabPage
      kicker="Chain"
      title={state?.network?.name ?? "Sepolia"}
      body="Read live blocks on Sepolia. Lab deploy writes vault and token addresses into this app."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LabStat label="RPC" value={live ? "Connected" : "Down"} live={live} hint={state?.rpc} />
        <LabStat
          label="Block time"
          value={state?.time ? state.time.iso.slice(0, 19).replace("T", " ") : "—"}
          hint={state?.block ? `block ${state.block}` : "no RPC"}
        />
        <LabStat
          label="TVL"
          value={snap?.snapshot ? formatUsd(snap.snapshot.tvlUsd) : "—"}
          hint={snap?.snapshot ? `${snap.snapshot.cardsMinted} cards` : "deploy first"}
        />
        <LabStat
          label="Coupon surplus"
          value={
            snap?.snapshot?.treasury?.length
              ? snap.snapshot.treasury.map((row) => `${Number(row.amount).toLocaleString()} ${row.symbol}`).join(" · ")
              : "—"
          }
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <CtaButton variant="ghost" disabled={running} onClick={() => void act("time")}>
          Read time
        </CtaButton>
      </div>

      {catalog?.plans?.length ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Surface className="overflow-auto p-2">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-[var(--ink-3)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Lock</th>
                  <th className="px-4 py-3 font-medium">APY</th>
                  <th className="px-4 py-3 font-medium">Fee</th>
                </tr>
              </thead>
              <tbody>
                {catalog.plans.map((p) => (
                  <tr key={p.id} className="border-t border-white/6">
                    <td className="px-4 py-3 capitalize">{p.slug}</td>
                    <td className="px-4 py-3">{p.lockDays}d</td>
                    <td className="num px-4 py-3">{p.apyBps / 100}%</td>
                    <td className="num px-4 py-3">{p.emergencyFeeBps / 100}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
          <Surface className="overflow-auto p-2">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-[var(--ink-3)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Oracle</th>
                </tr>
              </thead>
              <tbody>
                {catalog.assets?.map((a) => (
                  <tr key={a.symbol} className="border-t border-white/6">
                    <td className="px-4 py-3">
                      {a.symbol}
                      <p className="num mt-0.5 text-[11px] text-[var(--ink-3)]">{a.address}</p>
                    </td>
                    <td className="num px-4 py-3">{formatUsd(a.priceUsd, a.priceUsd >= 100 ? 0 : 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
        </div>
      ) : null}

      <div className="mt-6">
        <LogPane lines={lines} running={running} />
      </div>
    </LabPage>
  );
}
