"use client";

import Link from "next/link";

import { Counter, Head, Wipe } from "@/components/kit";
import { TokenMark } from "@/components/brand/token-mark";
import { DEMO_MONTHLY_EARNINGS, getToken } from "@/lib/dummy";
import { formatTokenAmount, formatUsd } from "@/lib/format";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const FACTS = [
  {
    k: "Same asset out",
    v: "Coupon and principal both settle in the token you sank. No wrapper, no emission, no swap on the way out.",
  },
  {
    k: "The token is the claim",
    v: "Ownership of the shaft is the NFT. Move it and the whole position moves with it, terms included.",
  },
  {
    k: "Lift on any day",
    v: "Accrued coupon can be pulled whenever you like. The lock only ever gates principal.",
  },
  {
    k: "Abandonment is priced",
    v: "Leaving early costs unclaimed coupon at a rate published on the seam. Principal is not the fee.",
  },
];

export function Ledger() {
  const rows = DEMO_MONTHLY_EARNINGS;
  const total = rows.reduce((sum, row) => sum + row.usd, 0);
  const peak = Math.max(...rows.map((row) => row.usd));

  return (
    <section id="ledger" className="mx-auto max-w-[1280px] px-4 py-24 lg:px-12 lg:py-32">
      <Head
        index="05"
        meta="Illustrative · twelve months"
        title={
          <>
            Everything <span className="text-flux">lifted</span>, month by month.
          </>
        }
        lead="A sample ledger of coupon pulled to wallets across the three seams. Figures are illustrative and drawn from modelled positions, not live protocol volume."
      />

      <div className="mt-14 grid gap-12 lg:grid-cols-[1.3fr_.7fr] lg:gap-16">
        <Wipe>
          <div className="flex items-baseline justify-between border-b border-bone-3 pb-3">
            <span className="tag">Period total</span>
            <Counter value={total} format={(n) => formatUsd(n, 0)} className="text-2xl" />
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--rule)]">
                <th className="tag py-2.5 text-left font-normal">Month</th>
                <th className="tag py-2.5 text-left font-normal">Asset</th>
                <th className="tag py-2.5 text-right font-normal">Lifted</th>
                <th className="tag hidden py-2.5 text-right font-normal sm:table-cell">Value</th>
                <th className="w-[26%] py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const token = getToken(row.tokenId);
                return (
                  <tr key={`${row.year}-${row.month}`} className="group border-b border-[var(--rule)] transition-colors hover:bg-[var(--slate)]">
                    <td className="num py-3 text-[11px] tracking-[0.1em] text-bone-2">
                      {MONTHS[row.month - 1]} &apos;{String(row.year).slice(2)}
                    </td>
                    <td className="py-3">
                      <span className="flex items-center gap-2">
                        <TokenMark id={token.id} symbol={token.symbol} size={20} />
                        <span className="num text-[11px]">{token.symbol}</span>
                      </span>
                    </td>
                    <td className="num py-3 text-right text-[11px] text-bone-2">
                      {formatTokenAmount(row.tokenAmount, token.symbol)}
                    </td>
                    <td className="num hidden py-3 text-right text-[11px] sm:table-cell">{formatUsd(row.usd, 0)}</td>
                    <td className="py-3 pl-4">
                      <span className="block h-1.5 bg-[var(--rule)]">
                        <span
                          className="block h-full bg-flux transition-[width] duration-700 group-hover:bg-bone"
                          style={{ width: `${(row.usd / peak) * 100}%` }}
                        />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Wipe>

        <Wipe delay={0.1} stagger={0.08}>
          {FACTS.map((fact) => (
            <div key={fact.k} className="border-b border-[var(--rule)] py-5 first:border-t">
              <p className="text-[0.95rem] font-medium">{fact.k}</p>
              <p className="mt-2 text-[0.85rem] leading-relaxed text-bone-2">{fact.v}</p>
            </div>
          ))}
          <Link href="/plans" className="act act-line mt-8 w-full">
            <span>Read the seam terms</span>
          </Link>
        </Wipe>
      </div>
    </section>
  );
}
