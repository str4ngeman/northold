"use client";

import { CountUp, FadeIn } from "@/components/motion";
import { EmptyVault } from "@/components/dashboard/empty-vault";
import { PositionCard } from "@/components/dashboard/position-card";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { WalletButton } from "@/components/wallet-button";
import { useNow } from "@/hooks/use-now";
import { usePositions } from "@/hooks/use-positions";
import { useSession } from "@/hooks/use-session";
import { formatUsd } from "@/lib/format";
import { useAccount } from "wagmi";

export default function VaultPage() {
  const now = useNow();
  const { user, loading } = useSession();
  const { address } = useAccount();
  const { views, catalog } = usePositions(now);

  const locked = views.reduce((sum, v) => sum + v.principalUsd, 0);
  const claimableUsd = views.reduce((sum, v) => sum + v.claimableUsd, 0);
  const canSeeVault = Boolean(user || (catalog?.protocol && address));

  if (loading) return <div className="h-40 animate-pulse rounded-[1.75rem] bg-white/5" />;

  return (
    <div className="mx-auto max-w-6xl">
      <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">Hold</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your positions</h1>
          <p className="mt-2 max-w-lg text-sm text-[var(--ink-2)]">
            {catalog?.protocol
              ? `Cards on this hold are live NFTs on ${catalog.network.shortLabel}. Claim and unlock confirm in MetaMask.`
              : "Each card is a live lock. Claim yield in the token you held."}
          </p>
        </div>
        <CtaButton href="/app/stake">Open a new hold</CtaButton>
      </FadeIn>

      {canSeeVault && views.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat label="Locked value" value={locked} money />
          <Stat label="Claimable" value={claimableUsd} money accent />
          <Stat label="Open positions" value={views.length} />
        </div>
      )}

      {!canSeeVault ? (
        <Surface className="mt-10 p-8">
          <h2 className="text-2xl font-semibold">Sign in to see your hold</h2>
          <p className="mt-2 text-sm text-[var(--ink-2)]">
            {catalog?.protocol
              ? `Sign in with email, then connect MetaMask on ${catalog.network.shortLabel} to mint and claim.`
              : "Sign in with email and password. Connect MetaMask when you are ready to lock."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <CtaButton href="/login">Sign in</CtaButton>
            <WalletButton />
          </div>
        </Surface>
      ) : views.length === 0 ? (
        <div className="mt-10">
          <EmptyVault />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {views.map((view, i) => (
            <FadeIn key={view.tokenId} delay={i * 0.05}>
              <PositionCard view={view} href={`/app/position/${view.tokenId}`} />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent, money }: { label: string; value: number; accent?: boolean; money?: boolean }) {
  return (
    <Surface className="p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-[var(--gain)]" : ""}`}>
        <CountUp value={value} format={money ? (n) => formatUsd(n) : (n) => String(Math.round(n))} />
      </p>
    </Surface>
  );
}
