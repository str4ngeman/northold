"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { isAddress } from "viem";

import { EmergencyDialog } from "@/components/emergency-dialog";
import { PositionCard } from "@/components/dashboard/position-card";
import { FadeIn, ProgressRing } from "@/components/motion";
import { ShareCardButton } from "@/components/share-card-button";
import { CtaButton } from "@/components/ui/cta-button";
import { Hint } from "@/components/ui/hint";
import { Surface } from "@/components/ui/surface";
import { useNow } from "@/hooks/use-now";
import { usePositions } from "@/hooks/use-positions";
import { useVaultTx } from "@/hooks/use-vault-tx";
import { useLabExec } from "@/hooks/use-lab-exec";
import {
  formatApy,
  formatFee,
  formatLock,
  formatTokenAmount,
  formatTokenId,
  formatUsd,
} from "@/lib/format";
import { explorerAddressUrl } from "@/lib/networks";

export default function PositionPage() {
  const params = useParams<{ id: string }>();
  const tokenId = Number(params.id);
  const now = useNow();
  const { views, refresh, catalog, loading } = usePositions(now);
  const { claim, unlock, emergencyExit, transferCard } = useVaultTx();
  const { run: warp, running: warping } = useLabExec();
  const view = useMemo(() => views.find((item) => item.tokenId === tokenId) ?? null, [views, tokenId]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-[1.75rem] bg-white/5" />;
  }

  if (!Number.isFinite(tokenId) || !view) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-semibold">Position not found</h1>
        <div className="mt-5">
          <CtaButton href="/app">Back to hold</CtaButton>
        </div>
      </div>
    );
  }

  const position = view;
  const active = position.status === "locked";
  const canClaim = active && position.claimableReward > 0.0000001;
  const canUnlock = position.isMatured && position.status === "locked";
  const canEmergency = active && !position.isMatured;

  async function act(path: string, ok: (data: Record<string, unknown>) => string) {
    setBusy(true);
    try {
      if (catalog?.protocol) {
        if (path === "claim") await claim(catalog, position.tokenId);
        else if (path === "unlock") await unlock(catalog, position.tokenId);
        else if (path === "emergency") await emergencyExit(catalog, position.tokenId);
        toast.success("Confirmed on-chain");
        await refresh();
        return;
      }
      const res = await fetch(`/api/positions/${position.tokenId}/${path}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      toast.success(ok(data));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function onTransfer() {
    if (!catalog?.protocol) return;
    if (!isAddress(transferTo)) {
      toast.error("Paste a valid address");
      return;
    }
    setBusy(true);
    try {
      await transferCard(catalog, position.tokenId, transferTo);
      toast.success("Card sent");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/app" className="inline-flex items-center gap-2 text-sm text-[var(--ink-2)] hover:text-[var(--ink)]">
        <ArrowLeft className="size-4" /> Hold
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <FadeIn>
          <div ref={cardRef} className="rounded-[2rem] bg-[#07090f] p-2">
            <PositionCard view={view} featured />
          </div>
          <div className="mt-4 flex justify-center">
            <ShareCardButton tokenId={view.tokenId} targetRef={cardRef} />
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">
            Position {formatTokenId(view.tokenId)}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {view.plan.name} · {view.token.symbol}
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-2)]">
            This NFT is the hold. Transfer it later and the whole lock goes with it.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <div className="relative">
              <ProgressRing value={view.lockProgress} color="var(--gain)" />
              <span className="num absolute inset-0 grid place-items-center text-sm">
                {Math.round(view.lockProgress * 100)}%
              </span>
            </div>
            <div>
              <p className="text-sm text-[var(--ink-3)]">Lock progress</p>
              <p className="text-lg font-semibold">{formatLock(view.plan.lockSeconds)}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <Row label="Principal" value={formatTokenAmount(view.principalAmount, view.token.symbol)} />
            <Row label="Value" value={formatUsd(view.principalUsd)} />
            <Row
              label={`Claimable ${view.token.symbol}`}
              value={formatTokenAmount(view.claimableReward, view.token.symbol)}
              hint="Pull this any time. Already-claimed yield stays yours even if you exit early."
              gain
            />
            <Row label="Claimed" value={formatTokenAmount(view.claimedReward, view.token.symbol)} />
            <Row label="Coupon" value={formatApy(view.plan.apyBps)} />
            <Row
              label="Early exit fee"
              value={formatFee(view.plan.emergencyFeeBps)}
              hint="Taken from principal only if you break the lock before maturity."
            />
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <CtaButton
              disabled={!canClaim || busy}
              onClick={() =>
                void act("claim", (d) => `Claimed ${formatTokenAmount(Number((d as { claimed?: number }).claimed ?? 0), position.token.symbol)}`)
              }
            >
              Claim {view.token.symbol}
            </CtaButton>
            <CtaButton
              variant="ghost"
              disabled={!canUnlock || busy}
              onClick={() =>
                void act(
                  "unlock",
                  (d) => `Returned ${formatTokenAmount(Number((d as { principal: number }).principal), position.token.symbol)}`,
                )
              }
            >
              Release principal
            </CtaButton>
            <CtaButton variant="ghost" disabled={!canEmergency || busy} onClick={() => setEmergencyOpen(true)}>
              Exit early
            </CtaButton>
          </div>

          {catalog?.protocol && catalog.network.capabilities.warp && active && !position.isMatured ? (
            <div className="mt-4">
              <p className="text-xs text-[var(--ink-3)]">
                Local Anvil only — advance time so this lock can mature without waiting.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CtaButton
                  variant="ghost"
                  className="h-10 px-4"
                  disabled={warping || busy}
                  onClick={() =>
                    void (async () => {
                      await warp("warp", ["1d"]);
                      await refresh();
                      toast.success("Chain time +1 day");
                    })()
                  }
                >
                  +1 day
                </CtaButton>
                <CtaButton
                  variant="ghost"
                  className="h-10 px-4"
                  disabled={warping || busy}
                  onClick={() =>
                    void (async () => {
                      const secs = Math.max(60, Math.ceil(position.remainingMs / 1000) + 60);
                      await warp("warp", [`${secs}s`]);
                      await refresh();
                      toast.success("Warped past the lock");
                    })()
                  }
                >
                  Warp to maturity
                </CtaButton>
              </div>
            </div>
          ) : null}

          {catalog?.protocol ? (
            <p className="mt-4 text-sm text-[var(--ink-3)]">
              {catalog.protocol.explorerUrl ? (
                <a
                  href={explorerAddressUrl(catalog.protocol.explorerUrl, catalog.protocol.vault)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--light)]"
                >
                  View vault on {catalog.network.shortLabel}
                </a>
              ) : (
                `On ${catalog.network.name}`
              )}
            </p>
          ) : null}

          {catalog?.protocol ? (
            <div className="mt-4 flex max-w-lg gap-2">
              <input
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="Transfer card to 0x…"
                className="h-12 flex-1 rounded-full bg-white/4 px-4 font-mono text-sm outline-none ring-1 ring-white/10 focus:ring-[var(--light)]"
              />
              <CtaButton variant="ghost" disabled={busy} onClick={() => void onTransfer()}>
                Send
              </CtaButton>
            </div>
          ) : null}

          <EmergencyDialog
            view={view}
            open={emergencyOpen}
            onOpenChange={setEmergencyOpen}
            onConfirm={() =>
              act(
                "emergency",
                (d) =>
                  `Returned ${formatTokenAmount(Number((d as { returned: number }).returned), position.token.symbol)}`,
              )
            }
          />
        </FadeIn>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  gain,
}: {
  label: string;
  value: string;
  hint?: string;
  gain?: boolean;
}) {
  return (
    <Surface className="p-4">
      <dt className="text-xs text-[var(--ink-3)]">
        {hint ? <Hint text={hint}>{label}</Hint> : label}
      </dt>
      <dd className={`num mt-1 text-lg font-semibold ${gain ? "text-[var(--gain)]" : ""}`}>{value}</dd>
    </Surface>
  );
}
