"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { EmergencyDialog } from "@/components/emergency-dialog";
import { ShareCardButton } from "@/components/share-card-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { VaultCard } from "@/components/vault-card";
import { useHasHydrated, useNow } from "@/hooks/use-now";
import { usePositionView } from "@/hooks/use-owned-views";
import {
  formatApy,
  formatFee,
  formatLock,
  formatTokenAmount,
  formatTokenId,
  formatUsd,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/store/vault-store";

export default function PositionPage() {
  const params = useParams<{ id: string }>();
  const tokenId = Number(params.id);
  const now = useNow();
  const hydrated = useHasHydrated();
  const view = usePositionView(tokenId, now);
  const claim = useVaultStore((s) => s.claim);
  const unlock = useVaultStore((s) => s.unlock);
  const emergencyUnlock = useVaultStore((s) => s.emergencyUnlock);
  const cardRef = useRef<HTMLDivElement>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
      </main>
    );
  }

  if (!Number.isFinite(tokenId) || !view) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl">Card not found</h1>
        <Link href="/app" className={cn(buttonVariants(), "mt-6 inline-flex")}>
          Back to vault
        </Link>
      </main>
    );
  }

  const position = view;
  const active = position.status === "locked";
  const canClaim = active && position.claimableUsdt > 0.0001;
  const canUnlock = position.isMatured && position.status === "locked";
  const canEmergency = active && !position.isMatured;

  function onClaim() {
    try {
      const amount = claim(position.tokenId);
      toast.success(`Claimed ${formatUsd(amount)} USDT`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Claim failed");
    }
  }

  function onUnlock() {
    try {
      const result = unlock(position.tokenId);
      toast.success(
        `Returned ${formatTokenAmount(result.principal, position.token.symbol)} and ${formatUsd(result.usdt)} USDT`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unlock failed");
    }
  }

  function onEmergency() {
    const result = emergencyUnlock(position.tokenId);
    toast.success(
      `Returned ${formatTokenAmount(result.returned, position.token.symbol)}. Fee ${formatTokenAmount(result.fee, position.token.symbol)}.`,
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col items-center">
        <div ref={cardRef} className="bg-[#07070c] p-4">
          <VaultCard view={view} size="lg" />
        </div>
        <div className="mt-4">
          <ShareCardButton tokenId={view.tokenId} targetRef={cardRef} />
        </div>
      </div>

      <div>
        <p className="font-display text-xs tracking-[0.35em] text-primary uppercase">
          Position {formatTokenId(view.tokenId)}
        </p>
        <h1 className="mt-2 font-display text-4xl">
          {view.plan.name} · {view.token.symbol}
        </h1>
        <p className="mt-2 text-muted-foreground">
          This NFT is the stake. Transfer (coming later) sells the whole locked position.
        </p>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2">
          <Stat label="Principal" value={formatTokenAmount(view.principalAmount, view.token.symbol)} />
          <Stat label="Value" value={formatUsd(view.principalUsd)} />
          <Stat label="USDT accrued" value={formatUsd(view.accruedUsdt)} />
          <Stat label="Claimable now" value={formatUsd(view.claimableUsdt)} />
          <Stat label="Already claimed" value={formatUsd(view.claimedUsdt)} />
          <Stat label="Coupon" value={formatApy(view.plan.apyBps)} />
          <Stat label="Lock" value={formatLock(view.plan.lockSeconds)} />
          <Stat label="Emergency fee" value={formatFee(view.plan.emergencyFeeBps)} />
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={onClaim} disabled={!canClaim}>
            Claim USDT
          </Button>
          <Button variant="secondary" onClick={onUnlock} disabled={!canUnlock}>
            Unlock principal
          </Button>
          <Button
            variant="destructive"
            onClick={() => setEmergencyOpen(true)}
            disabled={!canEmergency}
          >
            Emergency unlock
          </Button>
          <Button variant="outline" disabled title="Secondary market comes with the contract">
            Transfer / Sell
          </Button>
        </div>

        {view.status === "emergencyExited" && (
          <p className="mt-4 text-sm text-destructive">
            Seal broken. Principal returned minus fee. Unclaimed yield was forfeited.
          </p>
        )}
        {view.status === "unlocked" && (
          <p className="mt-4 text-sm text-emerald-400">
            Mature unlock complete. Same tokens returned, remaining USDT paid.
          </p>
        )}

        <EmergencyDialog
          view={view}
          open={emergencyOpen}
          onOpenChange={setEmergencyOpen}
          onConfirm={onEmergency}
        />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-card/60 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
