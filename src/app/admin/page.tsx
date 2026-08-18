"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { AdminPage, AdminTable, StatusPill, Td, Th } from "@/components/admin/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import type { BusinessReport } from "@/lib/admin/business";
import { formatApy, formatUsd } from "@/lib/format";

function money(n: number, digits = n >= 1000 ? 0 : 2) {
  return formatUsd(n, digits);
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "gain" | "loss" | "light";
}) {
  const color =
    accent === "gain" ? "text-[var(--gain)]" : accent === "loss" ? "text-[var(--loss)]" : accent === "light" ? "text-[var(--light)]" : "";
  return (
    <Surface className="p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">{label}</p>
      <p className={`num mt-2 text-2xl font-semibold sm:text-3xl ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--ink-3)]">{hint}</p> : null}
    </Surface>
  );
}

export default function AdminHome() {
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/business", { cache: "no-store" });
      const data = (await res.json()) as BusinessReport & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setReport(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const h = report?.headline;
  const book = report?.book;

  return (
    <AdminPage
      kicker="Business"
      title="The books"
      description="Every dollar locked, owed, and paid. Chain is the ledger when the hold is live."
      action={
        <CtaButton variant="ghost" className="h-11 px-4" disabled={busy} onClick={() => void load()}>
          <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
          Refresh
        </CtaButton>
      }
    >
      {error ? <p className="mb-4 text-sm text-[var(--loss)]">{error}</p> : null}
      {report?.note ? <p className="mb-4 text-sm text-[var(--ink-3)]">{report.note}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Currently locked"
          value={h ? money(h.lockedUsd) : "—"}
          hint={book ? `${book.locked} open cards · ${money(h?.investedUsd ?? 0)} ever minted` : "TVL in the vault"}
        />
        <Stat
          label="Yield paid"
          value={h ? money(h.couponPaidUsdt) : "—"}
          hint="Claims + coupon paid on unlock, in USD"
          accent="gain"
        />
        <Stat
          label="Due now"
          value={h ? money(h.claimableUsdt) : "—"}
          hint={h ? `Accrued ${money(h.accruedUsdt)} lifetime` : "Claimable coupon"}
          accent="light"
        />
        <Stat
          label="Yield treasury"
          value={h ? money(h.treasuryUsdt) : "—"}
          hint={
            h?.coverage == null
              ? "Nothing due"
              : h.coverage >= 1
                ? `${h.coverage.toFixed(1)}× the amount due`
                : `Short ${money(h.claimableUsdt - h.treasuryUsdt)} vs due`
          }
          accent={h?.coverage != null && h.coverage < 1 ? "loss" : undefined}
        />
      </div>

      {report ? (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Cards minted" value={String(book?.cards ?? 0)} hint={`${book?.uniqueOwners ?? 0} owners`} />
            <Stat label="Ready to unlock" value={String(book?.maturedOpen ?? 0)} hint="Matured, still locked" />
            <Stat label="Still to accrue" value={money(book?.remainingCouponUsdt ?? 0)} hint="If every lock is held to maturity" />
            <Stat
              label="Forfeited on exit"
              value={money(book?.forfeitedUsdt ?? 0)}
              hint={`${book?.emergency ?? 0} early exits`}
            />
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div>
              <SectionTitle>Locked by asset</SectionTitle>
              <AdminTable>
                <thead>
                  <tr>
                    <Th>Asset</Th>
                    <Th>USD</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.assets.length === 0 ? (
                    <tr>
                      <Td className="text-[var(--ink-3)]">Nothing locked.</Td>
                      <Td />
                    </tr>
                  ) : (
                    report.assets.map((row) => (
                      <tr key={row.label} className="border-t border-white/6">
                        <Td>{row.label}</Td>
                        <Td className="num">{money(row.usd)}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </AdminTable>
            </div>
            <div>
              <SectionTitle>By plan</SectionTitle>
              <AdminTable>
                <thead>
                  <tr>
                    <Th>Plan</Th>
                    <Th>Cards</Th>
                    <Th>Locked</Th>
                    <Th>Due</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.plans.length === 0 ? (
                    <tr>
                      <Td className="text-[var(--ink-3)]">No mints yet.</Td>
                      <Td />
                      <Td />
                      <Td />
                    </tr>
                  ) : (
                    report.plans.map((plan) => (
                      <tr key={plan.slug} className="border-t border-white/6">
                        <Td>
                          <p className="capitalize">{plan.name}</p>
                          <p className="text-[11px] text-[var(--ink-3)]">{formatApy(plan.apyBps)}</p>
                        </Td>
                        <Td className="num">{plan.cards}</Td>
                        <Td className="num">{money(plan.lockedUsd)}</Td>
                        <Td className="num">{money(plan.claimableUsdt)}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </AdminTable>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <Surface className="p-5">
              <SectionTitle tight>Card book</SectionTitle>
              <dl className="mt-3 space-y-2 text-sm">
                <Line k="Open locks" v={String(book?.locked ?? 0)} />
                <Line k="Redeemed" v={String(book?.unlocked ?? 0)} />
                <Line k="Early exits" v={String(book?.emergency ?? 0)} />
                <Line k="Referral paid" v={money(book?.referralPaidUsdt ?? 0)} />
              </dl>
            </Surface>
            <Surface className="p-5">
              <SectionTitle tight>Cash movement</SectionTitle>
              <dl className="mt-3 space-y-2 text-sm">
                <Line k="Treasury funded" v={money(report.cash.rewardsFundedUsdt)} />
                <Line k="Coupon paid" v={money(report.cash.couponPaidUsdt)} />
                <Line k="Principal returned" v={money(report.cash.principalReturnedUsd)} />
                <Line k="Exit fees in vault" v={money(report.cash.emergencyFeesUsd)} />
              </dl>
            </Surface>
            <Surface className="p-5">
              <SectionTitle tight>People</SectionTitle>
              <dl className="mt-3 space-y-2 text-sm">
                <Line k="Users" v={String(report.people.users)} />
                <Line k="Wallets" v={String(report.people.wallets)} />
                <Line k="Referred" v={String(report.people.referred)} />
                <Line k="Open support" v={String(report.people.openSupport)} href="/admin/support" />
              </dl>
            </Surface>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <Surface className="p-5">
              <SectionTitle tight>Mix</SectionTitle>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Rarity</p>
                  <ul className="mt-2 space-y-1">
                    {report.mix.rarity.map((row) => (
                      <li key={row.label} className="flex justify-between capitalize">
                        <span>{row.label}</span>
                        <span className="num text-[var(--ink-2)]">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Size</p>
                  <ul className="mt-2 space-y-1">
                    {report.mix.size.map((row) => (
                      <li key={row.label} className="flex justify-between capitalize">
                        <span>{row.label}</span>
                        <span className="num text-[var(--ink-2)]">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Surface>
            <Surface className="p-5">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle tight>Protocol</SectionTitle>
                <p className="text-xs text-[var(--ink-3)]">{report.source === "chain" ? "Live vault" : "Mongo book"}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill on={!report.treasury.depositsPaused} label={report.treasury.depositsPaused ? "Deposits paused" : "Deposits open"} warn={report.treasury.depositsPaused} />
                <StatusPill on={!report.treasury.exitsPaused} label={report.treasury.exitsPaused ? "Exits paused" : "Exits open"} warn={report.treasury.exitsPaused} />
                <StatusPill on label={`Referral ${(report.treasury.referralBps / 100).toFixed(report.treasury.referralBps % 100 === 0 ? 0 : 1)}%`} />
              </div>
              {report.treasury.fees.length ? (
                <ul className="mt-4 space-y-1 text-sm">
                  {report.treasury.fees.map((fee) => (
                    <li key={fee.symbol} className="flex justify-between">
                      <span className="text-[var(--ink-3)]">{fee.symbol} fees</span>
                      <span className="num">
                        {fee.amount} · {money(fee.usd)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[var(--ink-3)]">No exit fees sitting in the vault.</p>
              )}
            </Surface>
          </div>

          <div className="mt-8">
            <SectionTitle>Recent activity</SectionTitle>
            <AdminTable>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Card</Th>
                  <Th>Detail</Th>
                </tr>
              </thead>
              <tbody>
                {report.activity.length === 0 ? (
                  <tr>
                    <Td className="text-[var(--ink-3)]">No vault events yet.</Td>
                    <Td />
                    <Td />
                  </tr>
                ) : (
                  report.activity.map((row, i) => (
                    <tr key={`${row.event}-${row.tokenId ?? i}-${i}`} className="border-t border-white/6">
                      <Td>{row.event}</Td>
                      <Td className="num">{row.tokenId != null ? `#${String(row.tokenId).padStart(4, "0")}` : "—"}</Td>
                      <Td className="text-[var(--ink-2)]">{row.detail}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </AdminTable>
          </div>
        </>
      ) : (
        <div className="mt-8 h-40 animate-pulse rounded-[1.75rem] bg-white/5" />
      )}
    </AdminPage>
  );
}

function SectionTitle({ children, tight }: { children: string; tight?: boolean }) {
  return (
    <p className={`text-xs uppercase tracking-[0.16em] text-[var(--ink-3)] ${tight ? "" : "mb-3"}`}>{children}</p>
  );
}

function Line({ k, v, href }: { k: string; v: string; href?: string }) {
  const value = href ? (
    <Link href={href} className="text-[var(--light)] hover:underline">
      {v}
    </Link>
  ) : (
    <span className="num">{v}</span>
  );
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--ink-3)]">{k}</dt>
      <dd>{value}</dd>
    </div>
  );
}
