"use client";

import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { useAccount } from "wagmi";

import { Counter, Wipe } from "@/components/kit";
import { EmptyVault } from "@/components/dashboard/empty-vault";
import { PositionCard } from "@/components/dashboard/position-card";
import { WalletButton } from "@/components/wallet-button";
import { useNow } from "@/hooks/use-now";
import { usePositions } from "@/hooks/use-positions";
import { useSession } from "@/hooks/use-session";
import { formatTokenAmount, formatUsd } from "@/lib/format";
import { seamOf } from "@/lib/seams";

export default function VaultPage() {
  const now = useNow();
  const { user, loading } = useSession();
  const { address } = useAccount();
  const { views, catalog } = usePositions(now);

  const locked = views.reduce((sum, v) => sum + v.principalUsd, 0);
  const liftable = views.reduce((sum, v) => sum + v.claimableUsd, 0);
  const lifted = views.reduce((sum, v) => sum + v.claimedReward * v.token.priceUsd, 0);
  const canSee = Boolean(user || (catalog?.protocol && address));

  if (loading) {
    return <div className="panel h-48 animate-pulse bg-[var(--slate)]" />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Wipe className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="tag whitespace-nowrap">Vault</span>
            <span className="h-px w-16 bg-[var(--rule)]" />
          </div>
          <h1 className="display mt-5 text-[clamp(2rem,4.6vw,3rem)]">Your workings.</h1>
          <p className="mt-3 max-w-lg text-[0.9rem] leading-relaxed text-bone-2">
            {catalog?.protocol
              ? `Every shaft below is a live position on ${catalog.network.shortLabel}. Lifting and hauling confirm in your wallet.`
              : "Every shaft below is a live position. Lift accrued coupon on any day of the term."}
          </p>
        </div>
        <Link href="/app/stake" className="act act-solid shrink-0">
          <span>Sink a shaft</span>
          <ArrowDown className="size-3.5" />
        </Link>
      </Wipe>

      {canSee && views.length > 0 ? (
        <Wipe delay={0.08} className="mt-10 grid gap-px bg-[var(--rule)] sm:grid-cols-3">
          <Stat label="Under ground" value={locked} money />
          <Stat label="Liftable now" value={liftable} money accent />
          <Stat label="Lifted to date" value={lifted} money />
        </Wipe>
      ) : null}

      {!canSee ? (
        <div className="panel ticked mt-12 bg-[#0b0b0c] p-8 lg:p-12">
          <p className="tag">Locked out</p>
          <h2 className="display mt-4 text-3xl">Sign in to read your register.</h2>
          <p className="mt-4 max-w-md text-[0.9rem] leading-relaxed text-bone-2">
            {catalog?.protocol
              ? `Sign in with email, then connect a wallet on ${catalog.network.shortLabel} to sink and lift.`
              : "Sign in with email and password. Connect a wallet when you are ready to sink."}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="/login" className="act act-solid">
              <span>Sign in</span>
            </Link>
            <WalletButton />
          </div>
        </div>
      ) : views.length === 0 ? (
        <div className="mt-12">
          <EmptyVault />
        </div>
      ) : (
        <>
          <Wipe delay={0.12} className="mt-12 flex items-center gap-4">
            <span className="tag whitespace-nowrap">Open shafts</span>
            <span className="h-px flex-1 bg-[var(--rule)]" />
            <span className="tag whitespace-nowrap">{views.length} on register</span>
          </Wipe>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {views.map((view, i) => (
              <Wipe key={view.tokenId} delay={i * 0.05} className="h-full">
                <PositionCard view={view} href={`/app/position/${view.tokenId}`} />
              </Wipe>
            ))}
          </div>

          <div className="mt-10 border-t border-[var(--rule)] pt-6">
            <p className="tag">By seam</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {["pulse", "horizon", "apex"].map((slug) => {
                const seam = seamOf(slug);
                const rows = views.filter((v) => v.plan.id === slug);
                const sum = rows.reduce((n, v) => n + v.principalUsd, 0);
                const claim = rows.reduce((n, v) => n + v.claimableReward, 0);
                const symbol = rows[0]?.token.symbol ?? "";
                return (
                  <div key={slug} className="flex items-baseline justify-between gap-3 border-b border-[var(--rule)] pb-3">
                    <span className="num flex items-center gap-2 text-[10px] tracking-[0.12em]" style={{ color: seam.color }}>
                      <span className="size-1.5" style={{ background: seam.color }} />
                      {seam.name.toUpperCase()}
                    </span>
                    <span className="num text-[11px] text-bone-2">
                      {rows.length ? formatUsd(sum, 0) : "—"}
                      {rows.length && claim > 0 ? ` · +${formatTokenAmount(claim, symbol)}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent, money }: { label: string; value: number; accent?: boolean; money?: boolean }) {
  return (
    <div className="bg-[#0b0b0c] p-5">
      <p className="tag">{label}</p>
      <p className={`mt-2.5 text-2xl ${accent ? "text-flux" : "text-bone"}`}>
        <Counter value={value} format={money ? (n) => formatUsd(n) : (n) => String(Math.round(n))} />
      </p>
    </div>
  );
}
