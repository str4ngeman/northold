"use client";

import { useCallback, useEffect, useState } from "react";

import { LabPage, LabStat } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { formatUsd } from "@/lib/format";

type Snapshot = {
  ok?: boolean;
  error?: string;
  snapshot?: {
    cardsMinted: number;
    planCount: number;
    rewardBalance: string;
    tvlUsd: number;
    referralBps: number;
    depositsPaused: boolean;
    exitsPaused: boolean;
    locked: { symbol: string; amount: string; usd: number }[];
    contracts: Record<string, string>;
  };
};

type Events = {
  explorerUrl?: string;
  events?: { event?: string; block: string; tx: string; args: Record<string, string> }[];
};

export default function LabMonitorPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<Events["events"]>([]);
  const [explorerUrl, setExplorerUrl] = useState("");
  const [polling, setPolling] = useState(true);

  const load = useCallback(async () => {
    const [s, e] = await Promise.all([fetch("/api/lab/snapshot"), fetch("/api/lab/events")]);
    setSnap((await s.json()) as Snapshot);
    const ev = (await e.json()) as Events;
    setEvents(ev.events ?? []);
    setExplorerUrl(ev.explorerUrl ?? "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [load, polling]);

  const s = snap?.snapshot;

  return (
    <LabPage kicker="Monitor" title="Watch the hold" body="TVL, treasury, and recent Minted / Claimed / Unlocked / EmergencyExited logs.">
      <div className="flex flex-wrap gap-3">
        <CtaButton onClick={() => void load()}>Refresh</CtaButton>
        <CtaButton variant="ghost" onClick={() => setPolling((v) => !v)}>
          {polling ? "Pause poll" : "Resume poll"}
        </CtaButton>
      </div>

      {snap?.error ? <p className="mt-4 text-sm text-[var(--loss)]">{snap.error}</p> : null}

      {s ? (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LabStat label="TVL" value={formatUsd(s.tvlUsd)} />
            <LabStat label="Cards" value={s.cardsMinted} />
            <LabStat label="Treasury" value={`${Number(s.rewardBalance).toLocaleString()} USDT`} />
            <LabStat
              label="Pauses"
              value={s.depositsPaused || s.exitsPaused ? "On" : "Off"}
              hint={`deposits ${s.depositsPaused} · exits ${s.exitsPaused}`}
            />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {s.locked.map((row) => (
              <Surface key={row.symbol} className="p-4">
                <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">{row.symbol} locked</p>
                <p className="num mt-1 text-lg">{row.amount}</p>
                <p className="text-xs text-[var(--ink-3)]">{formatUsd(row.usd)}</p>
              </Surface>
            ))}
          </div>
        </>
      ) : null}

      <Surface className="mt-8 overflow-auto p-2">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-[var(--ink-3)]">
            <tr>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Block</th>
              <th className="px-4 py-3 font-medium">Tx</th>
              <th className="px-4 py-3 font-medium">Args</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--ink-3)]" colSpan={4}>
                  No vault events in the last 2,000 blocks.
                </td>
              </tr>
            ) : (
              events?.map((ev, i) => (
                <tr key={`${ev.tx}-${i}`} className="border-t border-white/6">
                  <td className="px-4 py-3 text-[var(--light)]">{ev.event}</td>
                  <td className="num px-4 py-3">{ev.block}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {explorerUrl && ev.tx ? (
                      <a href={`${explorerUrl}/tx/${ev.tx}`} target="_blank" rel="noreferrer" className="text-[var(--light)]">
                        {ev.tx.slice(0, 10)}…
                      </a>
                    ) : (
                      ev.tx.slice(0, 10)
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--ink-2)]">
                    {Object.entries(ev.args)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(" · ")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Surface>
    </LabPage>
  );
}
