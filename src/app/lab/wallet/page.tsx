"use client";

import { useState } from "react";

import { LabPage, LabStat } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { formatUsd } from "@/lib/format";

type WalletRes = {
  ok?: boolean;
  error?: string;
  wallet?: {
    address: string;
    eth: string;
    referrer: string | null;
    claimableTotal: number;
    tokens: { symbol: string; balance: string; allowance: string }[];
    positions: {
      tokenId: number;
      plan: string;
      asset: string;
      principal: string;
      principalUsd: number;
      accrued: string;
      claimed: string;
      claimable: string;
      progressBps: number;
      status: string;
      rarity: string;
      sizeTier: string;
      unlockAt: number;
      matured: boolean;
      apyBps: number;
    }[];
  };
};

export default function LabWalletPage() {
  const [address, setAddress] = useState("");
  const [data, setData] = useState<WalletRes | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze(target = address) {
    setLoading(true);
    try {
      const res = await fetch(`/api/lab/wallet?address=${encodeURIComponent(target)}`);
      setData((await res.json()) as WalletRes);
    } finally {
      setLoading(false);
    }
  }

  const w = data?.wallet;

  return (
    <LabPage
      kicker="Wallet"
      title="Read a user's cards"
      body="Balances, vault allowances, referrer, and every position NFT with live coupon math."
    >
      <div className="mt-4 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="h-12 flex-1 rounded-full bg-white/4 px-4 font-mono text-sm outline-none ring-1 ring-white/10 focus:ring-[var(--light)]"
        />
        <CtaButton disabled={loading} onClick={() => void analyze()}>
          {loading ? "Reading…" : "Analyze"}
        </CtaButton>
      </div>

      {data?.error ? <p className="mt-4 text-sm text-[var(--loss)]">{data.error}</p> : null}

      {w ? (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <LabStat label="ETH" value={Number(w.eth).toFixed(4)} />
            <LabStat label="Cards" value={w.positions.length} hint={w.referrer ? `ref ${w.referrer.slice(0, 6)}…` : "no referrer"} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {w.tokens.map((t) => (
              <Surface key={t.symbol} className="p-4">
                <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">{t.symbol}</p>
                <p className="num mt-1 text-lg">{t.balance}</p>
                <p className="text-xs text-[var(--ink-3)]">allowance {t.allowance}</p>
              </Surface>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {w.positions.length === 0 ? (
              <p className="text-sm text-[var(--ink-3)]">No position cards on this address.</p>
            ) : (
              w.positions.map((p) => (
                <Surface key={p.tokenId} className="p-5">
                  <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">
                    #{p.tokenId} · {p.plan} · {p.status}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {p.principal} {p.asset}
                  </h2>
                  <p className="text-sm text-[var(--ink-2)]">
                    {formatUsd(p.principalUsd)} · {p.apyBps / 100}% APY · {p.rarity}/{p.sizeTier}
                  </p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-[var(--light)]"
                      style={{ width: `${Math.min(100, p.progressBps / 100)}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-[var(--ink-3)]">Accrued</p>
                      <p className="num">{p.accrued}</p>
                    </div>
                    <div>
                      <p className="text-[var(--ink-3)]">Claimed</p>
                      <p className="num">{p.claimed}</p>
                    </div>
                    <div>
                      <p className="text-[var(--ink-3)]">Claimable</p>
                      <p className="num text-[var(--gain)]">{p.claimable} {p.asset}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[var(--ink-3)]">
                    {p.matured ? "Matured" : `Unlock ${new Date(p.unlockAt * 1000).toISOString().slice(0, 16).replace("T", " ")}`}
                  </p>
                </Surface>
              ))
            )}
          </div>
        </>
      ) : null}
    </LabPage>
  );
}
