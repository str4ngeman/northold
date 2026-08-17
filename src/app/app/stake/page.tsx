"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VaultCard } from "@/components/vault-card";
import { MOCK_WALLET, PLANS, TOKENS, getPlan, getToken } from "@/lib/dummy";
import {
  buildPositionView,
  principalUsd,
  rarityFrom,
  sizeTierFromUsd,
} from "@/lib/math";
import { formatApy, formatFee, formatLock, formatUsd } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import type { PositionNft } from "@/lib/types";
import { useVaultStore } from "@/store/vault-store";

export default function StakePage() {
  const router = useRouter();
  const now = useNow();
  const address = useVaultStore((s) => s.address);
  const connect = useVaultStore((s) => s.connect);
  const mint = useVaultStore((s) => s.mint);
  const nextTokenId = useVaultStore((s) => s.nextTokenId);

  const [assetId, setAssetId] = useState(TOKENS[2].id);
  const [planId, setPlanId] = useState(PLANS[1].id);
  const [amountInput, setAmountInput] = useState("0.4");
  const [busy, setBusy] = useState(false);

  const token = getToken(assetId);
  const plan = getPlan(planId);
  const amount = Number(amountInput);
  const usd = Number.isFinite(amount) && amount > 0 ? principalUsd(amount, token.priceUsd) : 0;
  const inRange = usd >= plan.minUsd && usd <= plan.maxUsd;

  const preview = useMemo(() => {
    const principalAmount = Number.isFinite(amount) && amount > 0 ? amount : plan.minUsd / token.priceUsd;
    const usdValue = principalUsd(principalAmount, token.priceUsd);
    const nft: PositionNft = {
      tokenId: nextTokenId,
      owner: address ?? MOCK_WALLET,
      assetId,
      principalAmount,
      planId,
      startedAt: now,
      rarity: rarityFrom(plan.lockSeconds, usdValue),
      sizeTier: sizeTierFromUsd(usdValue),
      claimedUsdt: 0,
      status: "locked",
    };
    return buildPositionView(nft, token, plan, now);
  }, [amount, assetId, plan, planId, token, address, nextTokenId, now]);

  function onMint() {
    if (!address) {
      connect();
      toast.message("Mock wallet connected — mint again to seal the card.");
      return;
    }
    if (!inRange) {
      toast.error(
        `This plan accepts ${formatUsd(plan.minUsd, 0)}–${formatUsd(plan.maxUsd, 0)}.`,
      );
      return;
    }
    setBusy(true);
    try {
      const position = mint({ assetId, planId, principalAmount: amount });
      toast.success(`Minted Vault Card ${position.tokenId.toString().padStart(4, "0")}`);
      router.push(`/app/position/${position.tokenId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mint failed");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="font-display text-xs tracking-[0.35em] text-primary uppercase">Mint</p>
        <h1 className="mt-2 font-display text-4xl">Seal a Vault Card</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Pick an asset, a plan, and an amount. The card you see is the position you will own.
        </p>

        <section className="mt-8">
          <Label className="text-muted-foreground">Asset</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TOKENS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAssetId(item.id)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  assetId === item.id
                    ? "border-primary/60 bg-primary/10"
                    : "border-white/8 bg-card/50 hover:border-white/20",
                )}
              >
                <p className="font-medium">{item.symbol}</p>
                <p className="text-xs text-muted-foreground">{formatUsd(item.priceUsd, 0)}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <Label className="text-muted-foreground">Plan</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {PLANS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlanId(item.id)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  planId === item.id
                    ? "border-primary/60 bg-primary/10"
                    : "border-white/8 bg-card/50 hover:border-white/20",
                )}
              >
                <p className="font-display text-lg">{item.name}</p>
                <p className="text-xs text-primary">{formatApy(item.apyBps)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatLock(item.lockSeconds)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatUsd(item.minUsd, 0)}–{formatUsd(item.maxUsd, 0)}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 max-w-sm">
          <Label htmlFor="amount">Amount ({token.symbol})</Label>
          <Input
            id="amount"
            className="mt-2"
            inputMode="decimal"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
          />
          <p className={cn("mt-2 text-sm", inRange ? "text-muted-foreground" : "text-destructive")}>
            ≈ {formatUsd(usd)} · plan range {formatUsd(plan.minUsd, 0)}–{formatUsd(plan.maxUsd, 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Emergency fee if you break the seal: {formatFee(plan.emergencyFeeBps)} of principal.
            Unclaimed USDT is forfeited.
          </p>
        </section>

        <Button size="lg" className="mt-8" onClick={onMint} disabled={busy}>
          {address ? "Mint Vault Card" : "Connect & mint"}
        </Button>
      </div>

      <aside className="flex flex-col items-center lg:sticky lg:top-24">
        <p className="mb-4 font-display text-xs tracking-[0.3em] text-muted-foreground uppercase">
          Live preview
        </p>
        <VaultCard view={preview} size="lg" />
      </aside>
    </main>
  );
}
