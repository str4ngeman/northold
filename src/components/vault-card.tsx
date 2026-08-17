import {
  formatApy,
  formatCountdown,
  formatTokenAmount,
  formatTokenId,
  formatUsd,
  rarityLabel,
  sizeTierLabel,
} from "@/lib/format";
import type { PositionView } from "@/lib/types";

type VaultCardProps = {
  view: PositionView;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function VaultCard({ view, size = "md", className = "" }: VaultCardProps) {
  const broken = view.status === "emergencyExited";
  const complete = view.status === "unlocked" || view.isMatured;
  const charging = view.status === "locked" && !view.isMatured;

  return (
    <article
      className={`vault-card glass vault-card--${size}${broken ? " is-broken" : ""} ${className}`.trim()}
      data-glass
      data-hover="true"
    >
      <div className="glass__flow" aria-hidden="true" />
      <div className="glass__blob" data-glass-blob aria-hidden="true" />
      <div className="glass__spec" aria-hidden="true" />

      <div className="vault-card__body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p className="label">Vault card</p>
            <p className="h3" style={{ marginTop: "0.35rem" }}>
              {rarityLabel(view.rarity)}
            </p>
          </div>
          <span className="vault-card__id">{formatTokenId(view.tokenId)}</span>
        </div>

        <div style={{ marginTop: "1.4rem" }}>
          <p className="label">{view.token.name}</p>
          <p className="h3" style={{ marginTop: "0.25rem" }}>
            {formatTokenAmount(view.principalAmount, view.token.symbol)}
          </p>
          <p className="body" style={{ marginTop: "0.2rem", fontSize: "var(--fs-small)" }}>
            {formatUsd(view.principalUsd)}
          </p>
        </div>

        <div className="vault-card__yield">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-small)", color: "var(--ink-2)" }}>
            <span>{view.plan.name}</span>
            <span style={{ color: "var(--light)" }}>{formatApy(view.plan.apyBps)}</span>
          </div>
          <p className="label" style={{ marginTop: "0.85rem" }}>
            Accrued USDT
          </p>
          <p className="h3" style={{ color: "var(--light)", marginTop: "0.2rem" }}>
            {formatUsd(view.accruedUsdt)}
          </p>
          <div className="vault-card__meter">
            <span style={{ width: `${Math.max(4, view.lockProgress * 100)}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.45rem", fontSize: "0.65rem", color: "var(--ink-3)", letterSpacing: "0.08em" }}>
            <span>
              {charging ? formatCountdown(view.remainingMs) : complete ? "Seal complete" : "Broken seal"}
            </span>
            <span>{Math.round(view.lockProgress * 100)}%</span>
          </div>
        </div>

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <p className="label" style={{ maxWidth: "60%" }}>
            {sizeTierLabel(view.sizeTier)}
          </p>
          <p className="label">Leagueto</p>
        </div>
      </div>

      {broken && (
        <div className="vault-card__stamp">
          <span>Broken seal</span>
        </div>
      )}
      {view.status === "unlocked" && (
        <div className="vault-card__stamp">
          <span>Redeemed</span>
        </div>
      )}
    </article>
  );
}
