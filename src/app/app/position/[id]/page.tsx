"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { EmergencyDialog } from "@/components/emergency-dialog";
import { LetterButton } from "@/components/kinetic/letter-button";
import { ShareCardButton } from "@/components/share-card-button";
import { VaultCard } from "@/components/vault-card";
import { useNow } from "@/hooks/use-now";
import { usePositions } from "@/hooks/use-positions";
import {
  formatApy,
  formatFee,
  formatLock,
  formatTokenAmount,
  formatTokenId,
  formatUsd,
} from "@/lib/format";

export default function PositionPage() {
  const params = useParams<{ id: string }>();
  const tokenId = Number(params.id);
  const now = useNow();
  const { views, refresh } = usePositions(now);
  const view = useMemo(() => views.find((item) => item.tokenId === tokenId) ?? null, [views, tokenId]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  if (!Number.isFinite(tokenId) || !view) {
    return (
      <main className="page">
        <div className="container">
          <h1 className="h2">Card not found</h1>
          <div style={{ marginTop: "var(--s-5)" }}>
            <LetterButton href="/app" label="Back to vault" />
          </div>
        </div>
      </main>
    );
  }

  const position = view;
  const active = position.status === "locked";
  const canClaim = active && position.claimableUsdt > 0.0001;
  const canUnlock = position.isMatured && position.status === "locked";
  const canEmergency = active && !position.isMatured;

  async function act(path: string, ok: (data: Record<string, unknown>) => string) {
    const res = await fetch(`/api/positions/${position.tokenId}/${path}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    toast.success(ok(data));
    await refresh();
  }

  return (
    <main className="page">
      <div className="container split">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div ref={cardRef} style={{ background: "#07070c", padding: "1rem" }}>
            <VaultCard view={view} size="lg" />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <ShareCardButton tokenId={view.tokenId} targetRef={cardRef} />
          </div>
        </div>

        <div>
          <p className="label">Position {formatTokenId(view.tokenId)}</p>
          <h1 className="h2 hero-copy">
            {view.plan.name} · {view.token.symbol}
          </h1>
          <p className="body hero-body">This NFT is the stake. Transfer later sells the whole locked position.</p>

          <dl style={{ marginTop: "var(--s-5)" }}>
            <div className="stat"><dt>Principal</dt><dd>{formatTokenAmount(view.principalAmount, view.token.symbol)}</dd></div>
            <div className="stat"><dt>Value</dt><dd>{formatUsd(view.principalUsd)}</dd></div>
            <div className="stat"><dt>USDT accrued</dt><dd>{formatUsd(view.accruedUsdt)}</dd></div>
            <div className="stat"><dt>Claimable</dt><dd>{formatUsd(view.claimableUsdt)}</dd></div>
            <div className="stat"><dt>Claimed</dt><dd>{formatUsd(view.claimedUsdt)}</dd></div>
            <div className="stat"><dt>Coupon</dt><dd>{formatApy(view.plan.apyBps)}</dd></div>
            <div className="stat"><dt>Lock</dt><dd>{formatLock(view.plan.lockSeconds)}</dd></div>
            <div className="stat"><dt>Break fee</dt><dd>{formatFee(view.plan.emergencyFeeBps)}</dd></div>
          </dl>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "var(--s-5)" }}>
            <LetterButton
              label="Claim USDT"
              disabled={!canClaim}
              onClick={() => void act("claim", (d) => `Claimed ${formatUsd(Number((d as { claimed?: number }).claimed))} USDT`)}
            />
            <LetterButton
              label="Release principal"
              variant="ghost"
              disabled={!canUnlock}
              onClick={() =>
                void act(
                  "unlock",
                  (d) =>
                    `Returned ${formatTokenAmount(Number((d as { principal: number }).principal), position.token.symbol)}`,
                )
              }
            />
            <LetterButton
              label="Break seal"
              variant="ghost"
              disabled={!canEmergency}
              onClick={() => setEmergencyOpen(true)}
            />
            <LetterButton label="Transfer / Sell" variant="ghost" disabled />
          </div>

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
        </div>
      </div>
    </main>
  );
}
