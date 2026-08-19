"use client";

import { useCallback, useEffect, useState } from "react";

import { LabPage } from "@/components/lab/ui";
import { formatUsd } from "@/lib/format";

type Snapshot = {
  error?: string;
  snapshot?: {
    cardsMinted: number;
    tvlUsd: number;
    treasury: { symbol: string; amount: string }[];
    depositsPaused: boolean;
    exitsPaused: boolean;
  };
};

type Events = {
  explorerUrl?: string;
  events?: { event?: string; block: string; tx: string }[];
};

export default function LabMonitorPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<Events["events"]>([]);
  const [explorerUrl, setExplorerUrl] = useState("");

  const load = useCallback(async () => {
    const [s, e] = await Promise.all([fetch("/api/lab/snapshot"), fetch("/api/lab/events")]);
    setSnap((await s.json()) as Snapshot);
    const ev = (await e.json()) as Events;
    setEvents((ev.events ?? []).slice(0, 12));
    setExplorerUrl(ev.explorerUrl ?? "");
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  const s = snap?.snapshot;

  return (
    <LabPage kicker="Monitor" title="Live" body="TVL, cards, coupon surplus, recent vault events.">
      {snap?.error ? <p className="text-sm text-[var(--loss)]">{snap.error}</p> : null}

      {s ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">TVL</dt>
            <dd className="num mt-1 text-lg">{formatUsd(s.tvlUsd)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">Cards</dt>
            <dd className="num mt-1 text-lg">{s.cardsMinted}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">Surplus</dt>
            <dd className="mt-1 text-sm text-[var(--ink-2)]">
              {s.treasury.length
                ? s.treasury.map((row) => `${Number(row.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${row.symbol}`).join(" · ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">Pauses</dt>
            <dd className="mt-1 text-sm">{s.depositsPaused || s.exitsPaused ? "on" : "off"}</dd>
          </div>
        </dl>
      ) : null}

      <ul className="mt-8 divide-y divide-white/6 text-sm">
        {(events ?? []).length === 0 ? (
          <li className="py-4 text-[var(--ink-3)]">No events in the last 2,000 blocks.</li>
        ) : (
          events?.map((ev, i) => (
            <li key={`${ev.tx}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
              <span className="text-[var(--light)]">{ev.event}</span>
              <span className="num text-xs text-[var(--ink-3)]">
                {explorerUrl && ev.tx ? (
                  <a href={`${explorerUrl}/tx/${ev.tx}`} target="_blank" rel="noreferrer">
                    {ev.tx.slice(0, 10)}…
                  </a>
                ) : (
                  ev.tx?.slice(0, 10)
                )}
                <span className="ml-2">{ev.block}</span>
              </span>
            </li>
          ))
        )}
      </ul>
    </LabPage>
  );
}
