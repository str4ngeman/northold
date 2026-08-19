"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { isAddress } from "viem";

import { EmergencyDialog } from "@/components/emergency-dialog";
import { PositionCard } from "@/components/dashboard/position-card";
import { DepthRule, Meter, Row, Wipe } from "@/components/kit";
import { ShareCardButton } from "@/components/share-card-button";
import { useNow } from "@/hooks/use-now";
import { usePositions } from "@/hooks/use-positions";
import { useVaultTx } from "@/hooks/use-vault-tx";
import { useLabExec } from "@/hooks/use-lab-exec";
import { formatCountdown, formatFee, formatTokenAmount, formatTokenId, formatUsd } from "@/lib/format";
import { explorerAddressUrl } from "@/lib/networks";
import { gradeLabel, seamOf } from "@/lib/seams";

export default function ShaftPage() {
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

  if (loading) return <div className="panel h-64 animate-pulse bg-[var(--slate)]" />;

  if (!Number.isFinite(tokenId) || !view) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <p className="tag">Not on the register</p>
        <h1 className="display mt-4 text-3xl">No such shaft.</h1>
        <Link href="/app" className="act act-line mt-8">
          <span>Back to the vault</span>
        </Link>
      </div>
    );
  }

  const position = view;
  const seam = seamOf(view.plan.id, view.plan.lockSeconds);
  const active = position.status === "locked";
  const canClaim = active && position.claimableReward > 0.0000001;
  const canUnlock = position.isMatured && position.status === "locked";
  const canEmergency = active && !position.isMatured;
  const days = Math.round(view.plan.lockSeconds / 86400);
  const day = Math.round(days * view.lockProgress);

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
      toast.success("Shaft transferred");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/app"
        className="num inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-bone-3 transition-colors hover:text-bone"
      >
        <ArrowLeft className="size-3.5" /> Vault
      </Link>

      <Wipe className="mt-8 flex flex-wrap items-end justify-between gap-5 border-b border-[var(--rule)] pb-6">
        <div>
          <p className="tag" style={{ color: seam.color }}>
            Seam {seam.index} · {seam.name} · {seam.depth}
          </p>
          <h1 className="display mt-4 text-[clamp(2rem,4.6vw,3rem)]">
            Shaft {formatTokenId(view.tokenId)}
          </h1>
          <p className="num mt-2 text-[11px] text-bone-3">
            {view.token.name.toUpperCase()} · OPENED {new Date(view.startedAt).toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="text-right">
          <p className="tag">Time to date</p>
          <p className="num mt-2 text-xl">{active && !view.isMatured ? formatCountdown(view.remainingMs) : "TERM CLOSED"}</p>
        </div>
      </Wipe>

      <div className="mt-10 grid gap-px bg-[var(--rule)] lg:grid-cols-[.85fr_1.15fr]">
        <Wipe className="bg-[#0b0b0c] p-6 lg:p-8">
          <div ref={cardRef} className="bg-[#0b0b0c]">
            <PositionCard view={view} featured />
          </div>
          <div className="mt-5 flex justify-center">
            <ShareCardButton tokenId={view.tokenId} targetRef={cardRef} />
          </div>

          <div className="mt-8 grid grid-cols-[92px_1fr] gap-6 border-t border-[var(--rule)] pt-8">
            <div>
              <p className="tag mb-4">Depth</p>
              <DepthRule active={view.plan.id} height={200} />
            </div>
            <div>
              <p className="text-[0.85rem] leading-relaxed text-bone-2">
                This token is the position. Transfer it and the whole shaft goes with it — the term, the coupon, and
                whatever is still accruing at the face.
              </p>
              <p className="num mt-4 text-[10px] leading-relaxed tracking-[0.1em] text-bone-3">
                MATRIX · {seam.matrix.toUpperCase()}
              </p>
            </div>
          </div>
        </Wipe>

        <Wipe delay={0.08} className="bg-[#0b0b0c] p-6 lg:p-8">
          <p className="tag">Progress</p>
          <div className="mt-4">
            <Meter value={view.lockProgress} color={seam.color} ticks={16} />
          </div>
          <div className="num mt-1 flex justify-between text-[10px] tracking-[0.12em] text-bone-3">
            <span>
              DAY {String(day).padStart(2, "0")} OF {days}
            </span>
            <span>{Math.round(view.lockProgress * 100)}%</span>
          </div>

          <dl className="mt-8 grid gap-x-10 sm:grid-cols-2">
            <Row label="Principal" value={formatTokenAmount(view.principalAmount, view.token.symbol)} />
            <Row label="Value" value={formatUsd(view.principalUsd)} />
            <Row
              label="Liftable"
              value={formatTokenAmount(view.claimableReward, view.token.symbol)}
              accent={seam.color}
            />
            <Row label="Lifted" value={formatTokenAmount(view.claimedReward, view.token.symbol)} />
            <Row label="Grade" value={`${gradeLabel(view.plan.apyBps)} %`} />
            <Row label="Abandon fee" value={formatFee(view.plan.emergencyFeeBps)} />
          </dl>

          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              className="act act-solid"
              disabled={!canClaim || busy}
              onClick={() =>
                void act(
                  "claim",
                  (d) =>
                    `Lifted ${formatTokenAmount(Number((d as { claimed?: number }).claimed ?? 0), position.token.symbol)}`,
                )
              }
            >
              <span>Lift {view.token.symbol}</span>
            </button>
            <button
              type="button"
              className="act act-line"
              disabled={!canUnlock || busy}
              onClick={() =>
                void act(
                  "unlock",
                  (d) => `Hauled ${formatTokenAmount(Number((d as { principal: number }).principal), position.token.symbol)}`,
                )
              }
            >
              <span>Haul principal</span>
            </button>
            <button type="button" className="act act-warn" disabled={!canEmergency || busy} onClick={() => setEmergencyOpen(true)}>
              <span>Abandon shaft</span>
            </button>
          </div>

          {catalog?.protocol && catalog.network.capabilities.warp && active && !position.isMatured ? (
            <div className="mt-8 border border-[var(--rule)] p-4">
              <p className="tag">Local chain only</p>
              <p className="mt-2 text-[0.82rem] text-bone-2">Advance chain time so this term can close without waiting.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="act act-line h-10"
                  disabled={warping || busy}
                  onClick={() =>
                    void (async () => {
                      await warp("warp", ["1d"]);
                      await refresh();
                      toast.success("Chain time +1 day");
                    })()
                  }
                >
                  <span>+1 day</span>
                </button>
                <button
                  type="button"
                  className="act act-line h-10"
                  disabled={warping || busy}
                  onClick={() =>
                    void (async () => {
                      const secs = Math.max(60, Math.ceil(position.remainingMs / 1000) + 60);
                      await warp("warp", [`${secs}s`]);
                      await refresh();
                      toast.success("Warped past the term");
                    })()
                  }
                >
                  <span>To maturity</span>
                </button>
              </div>
            </div>
          ) : null}

          {catalog?.protocol ? (
            <div className="mt-8 border-t border-[var(--rule)] pt-6">
              <p className="tag">Transfer</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="0x…"
                  className="num h-11 min-w-0 flex-1 border border-[var(--rule)] bg-[var(--pitch)] px-3 text-sm outline-none focus:border-flux"
                />
                <button type="button" className="act act-line" disabled={busy} onClick={() => void onTransfer()}>
                  <span>Send</span>
                </button>
              </div>
              {catalog.protocol.explorerUrl ? (
                <a
                  href={explorerAddressUrl(catalog.protocol.explorerUrl, catalog.protocol.vault)}
                  target="_blank"
                  rel="noreferrer"
                  className="num mt-4 inline-block text-[10px] uppercase tracking-[0.14em] text-flux"
                >
                  Vault on {catalog.network.shortLabel} ↗
                </a>
              ) : null}
            </div>
          ) : null}

          <EmergencyDialog
            view={view}
            open={emergencyOpen}
            onOpenChange={setEmergencyOpen}
            onConfirm={() =>
              act(
                "emergency",
                (d) => `Returned ${formatTokenAmount(Number((d as { returned: number }).returned), position.token.symbol)}`,
              )
            }
          />
        </Wipe>
      </div>
    </div>
  );
}
