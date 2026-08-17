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
    rewardBalance: string;
    referralBps: number;
  };
};

const WARPS = ["1d", "15d", "30d", "90d", "180d"];

export default function LabChainPage() {
  const { state, refresh } = useLabState(4000);
  const { lines, running, run } = useLabExec();
  const [custom, setCustom] = useState("12h");
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
  const canWarp = Boolean(state?.network?.capabilities.warp);

  return (
    <LabPage
      kicker="Chain"
      title={state?.network?.name ?? "Active chain"}
      body="Read live blocks on the network the app is pointed at. Time travel stays on Anvil."
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
          label="Coupon treasury"
          value={snap?.snapshot ? `${Number(snap.snapshot.rewardBalance).toLocaleString()} USDT` : "—"}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <CtaButton disabled={running} onClick={() => void act("anvil", ["start"])}>
          Start anvil
        </CtaButton>
        <CtaButton variant="ghost" disabled={running} onClick={() => void act("anvil", ["stop"])}>
          Stop
        </CtaButton>
        <CtaButton variant="ghost" disabled={running} onClick={() => void act("time")}>
          Read time
        </CtaButton>
      </div>

      {canWarp ? (
      <Surface className="mt-8 p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Warp</p>
        <p className="mt-1 text-sm text-[var(--ink-2)]">Advance the local chain. Locks mature without waiting.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {WARPS.map((w) => (
            <CtaButton key={w} variant="ghost" className="h-10 px-4" disabled={running} onClick={() => void act("warp", [w])}>
              +{w}
            </CtaButton>
          ))}
        </div>
        <div className="mt-4 flex max-w-sm gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-12 flex-1 rounded-full bg-white/4 px-4 text-sm outline-none ring-1 ring-white/10 focus:ring-[var(--light)]"
            placeholder="12h"
          />
          <CtaButton disabled={running || !custom} onClick={() => void act("warp", [custom])}>
            Warp
          </CtaButton>
        </div>
      </Surface>
      ) : (
        <p className="mt-6 text-sm text-[var(--ink-3)]">Warp is Anvil-only. Switch the app to Local in Admin → Settings to time-travel.</p>
      )}

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
