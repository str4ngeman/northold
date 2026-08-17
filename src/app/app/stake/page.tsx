"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LetterButton } from "@/components/kinetic/letter-button";
import { VaultCard } from "@/components/vault-card";
import { WalletButton } from "@/components/wallet-button";
import { useCatalog } from "@/hooks/use-catalog";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { formatApy, formatFee, formatLock, formatUsd } from "@/lib/format";
import { buildPositionView, principalUsd, rarityFrom, sizeTierFromUsd } from "@/lib/math";
import type { PositionNft } from "@/lib/types";

export default function StakePage() {
  const router = useRouter();
  const now = useNow();
  const catalog = useCatalog();
  const { user } = useSession();
  const [assetId, setAssetId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("0.4");
  const [busy, setBusy] = useState(false);

  const tokens = catalog?.tokens ?? [];
  const plans = catalog?.plans ?? [];
  const token = tokens.find((item) => item.id === (assetId ?? tokens[0]?.id));
  const plan = plans.find((item) => item.id === (planId ?? plans[1]?.id ?? plans[0]?.id));
  const amount = Number(amountInput);
  const usd = token && Number.isFinite(amount) && amount > 0 ? principalUsd(amount, token.priceUsd) : 0;
  const inRange = Boolean(plan && usd >= plan.minUsd && usd <= plan.maxUsd);

  const preview = useMemo(() => {
    if (!token || !plan) return null;
    const principalAmount =
      Number.isFinite(amount) && amount > 0 ? amount : plan.minUsd / token.priceUsd;
    const usdValue = principalUsd(principalAmount, token.priceUsd);
    const nft: PositionNft = {
      tokenId: catalog?.settings.nextTokenId ?? 1,
      owner: user?.address ?? "preview",
      assetId: token.id,
      principalAmount,
      planId: plan.id,
      startedAt: now,
      rarity: rarityFrom(plan.lockSeconds, usdValue),
      sizeTier: sizeTierFromUsd(usdValue),
      claimedUsdt: 0,
      status: "locked",
    };
    return buildPositionView(nft, token, plan, now);
  }, [amount, token, plan, catalog?.settings.nextTokenId, user?.address, now]);

  async function onMint() {
    if (!user) {
      toast.message("Sign in or connect a wallet first.");
      return;
    }
    if (!token || !plan || !inRange) {
      toast.error("Amount is outside this plan’s range.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: token.id, planId: plan.id, principalAmount: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mint failed");
      toast.success(`Sealed ${String(data.position.tokenId).padStart(4, "0")}`);
      router.push(`/app/position/${data.position.tokenId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mint failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="container split">
        <div>
          <p className="label">Mint</p>
          <h1 className="h2 hero-copy">Seal a vault card</h1>
          <p className="body hero-body">
            Pick an asset, a plan, and an amount. The plate you see is the position you will own.
          </p>
          {!user && (
            <div style={{ marginTop: "var(--s-4)", display: "flex", gap: "0.75rem" }}>
              <WalletButton />
              <LetterButton href="/login" label="Email login" variant="ghost" />
            </div>
          )}

          <p className="label" style={{ marginTop: "var(--s-6)" }}>
            Asset
          </p>
          <div className="pick" style={{ marginTop: "0.75rem", gridTemplateColumns: "repeat(2, 1fr)" }}>
            {tokens.map((item) => (
              <button
                key={item.id}
                type="button"
                className={(assetId ?? tokens[0]?.id) === item.id ? "is-on" : ""}
                onClick={() => setAssetId(item.id)}
              >
                {item.symbol}
                <span className="label" style={{ display: "block", marginTop: "0.35rem" }}>
                  {formatUsd(item.priceUsd, 0)}
                </span>
              </button>
            ))}
          </div>

          <p className="label" style={{ marginTop: "var(--s-5)" }}>
            Plan
          </p>
          <div className="pick" style={{ marginTop: "0.75rem", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {plans.map((item) => (
              <button
                key={item.id}
                type="button"
                className={(planId ?? plans[1]?.id ?? plans[0]?.id) === item.id ? "is-on" : ""}
                onClick={() => setPlanId(item.id)}
              >
                {item.name}
                <span className="label" style={{ display: "block", marginTop: "0.35rem" }}>
                  {formatApy(item.apyBps)} · {formatLock(item.lockSeconds)}
                </span>
              </button>
            ))}
          </div>

          {token && plan && (
            <label className="field" style={{ marginTop: "var(--s-5)" }}>
              <span className="label">Amount ({token.symbol})</span>
              <input
                inputMode="decimal"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
              />
              <span className="body" style={{ color: inRange ? "var(--ink-3)" : "var(--ink)" }}>
                ≈ {formatUsd(usd)} · {formatUsd(plan.minUsd, 0)}–{formatUsd(plan.maxUsd, 0)} · break fee{" "}
                {formatFee(plan.emergencyFeeBps)}
              </span>
            </label>
          )}

          <div style={{ marginTop: "var(--s-5)" }}>
            <LetterButton label={busy ? "Sealing" : "Mint vault card"} onClick={() => void onMint()} disabled={busy} />
          </div>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <p className="label" style={{ marginBottom: "1rem" }}>
            Live preview
          </p>
          {preview && <VaultCard view={preview} size="lg" />}
        </aside>
      </div>
    </main>
  );
}
