"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { erc20Abi, formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { ArrowDown } from "lucide-react";

import { TokenMark } from "@/components/brand/token-mark";
import { PositionCard } from "@/components/dashboard/position-card";
import { DepthRule, Row, Wipe } from "@/components/kit";
import { ConfettiBurst } from "@/components/motion";
import { WalletButton } from "@/components/wallet-button";
import { useCatalog } from "@/hooks/use-catalog";
import { useChainHead } from "@/hooks/use-chain-head";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { useVaultTx } from "@/hooks/use-vault-tx";
import { formatAddress, formatFee, formatTokenAmount, formatUsd } from "@/lib/format";
import {
  buildPositionView,
  dailyReward,
  principalUsd,
  projectedReward,
  rarityFrom,
  sizeTierFromUsd,
} from "@/lib/math";
import { gradeLabel, seamOf } from "@/lib/seams";
import type { PositionNft } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StakePage() {
  return (
    <Suspense fallback={<div className="panel h-64 animate-pulse bg-[var(--slate)]" />}>
      <SinkForm />
    </Suspense>
  );
}

function SinkForm() {
  const router = useRouter();
  const params = useSearchParams();
  const now = useNow();
  const catalog = useCatalog();
  const { user } = useSession();
  const { mint, address: wallet, ensureChain } = useVaultTx();
  const [assetId, setAssetId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(params.get("plan"));
  const [amountInput, setAmountInput] = useState("250");
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(false);
  const [funding, setFunding] = useState(false);

  const onChain = Boolean(catalog?.protocol);
  const canFaucet = Boolean(catalog?.network.capabilities.faucet);
  const networkName = catalog?.network.shortLabel ?? "the active chain";
  const { blockNumber } = useChainHead(onChain, catalog?.protocol?.chainId);
  const tokens = (catalog?.tokens ?? []).filter((item) => item.active !== false);
  const plans = (catalog?.plans ?? []).filter((item) => item.active !== false);
  const token = tokens.find((item) => item.id === (assetId ?? tokens[0]?.id));
  const plan = plans.find((item) => item.id === (planId ?? plans[1]?.id ?? plans[0]?.id));
  const seam = seamOf(plan?.id ?? "", plan?.lockSeconds);
  const amount = Number(amountInput);
  const usd = token && Number.isFinite(amount) && amount > 0 ? principalUsd(amount, token.priceUsd) : 0;
  const inRange = Boolean(plan && usd >= plan.minUsd && usd <= plan.maxUsd);
  const earned = token && plan ? projectedReward(amount, plan.apyBps, plan.lockSeconds) : 0;
  const daily = token && plan ? dailyReward(amount, plan.apyBps) : 0;

  const { data: rawBal, refetch: refetchBal } = useReadContract({
    address: token?.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    chainId: catalog?.protocol?.chainId,
    args: wallet ? [wallet] : undefined,
    blockNumber,
    query: { enabled: Boolean(onChain && token?.address && wallet) },
  });
  const balance = token && typeof rawBal === "bigint" ? Number(formatUnits(rawBal, token.decimals)) : null;

  const preview = useMemo(() => {
    if (!token || !plan) return null;
    const principalAmount = Number.isFinite(amount) && amount > 0 ? amount : plan.minUsd / token.priceUsd;
    const usdValue = principalUsd(principalAmount, token.priceUsd);
    const nft: PositionNft = {
      tokenId: catalog?.settings.nextTokenId ?? 1,
      owner: wallet ?? user?.address ?? "preview",
      assetId: token.id,
      principalAmount,
      planId: plan.id,
      startedAt: now,
      rarity: rarityFrom(plan.lockSeconds, usdValue),
      sizeTier: sizeTierFromUsd(usdValue),
      claimedReward: 0,
      status: "locked",
    };
    return buildPositionView(nft, token, plan, now);
  }, [amount, token, plan, catalog?.settings.nextTokenId, user?.address, wallet, now]);

  async function fundWallet() {
    if (!wallet) {
      toast.message("Connect a wallet first.");
      return;
    }
    setFunding(true);
    try {
      const res = await fetch("/api/lab/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: wallet,
          eth: "10",
          tokens: { usdt: "10000", usdc: "10000", weth: "10", wbtc: "1" },
        }),
      });
      const data = (await res.json()) as { error?: string; sent?: string[] };
      if (!res.ok) throw new Error(data.error || "Fund failed");
      toast.success(`Funded ${data.sent?.join(" · ")}`);
      await refetchBal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fund failed");
    } finally {
      setFunding(false);
    }
  }

  async function addTokenToWallet() {
    if (!token || !catalog?.protocol) return;
    try {
      await ensureChain(catalog.protocol.chainId);
      const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      if (!eth) throw new Error("No injected wallet available");
      await eth.request({
        method: "wallet_watchAsset",
        params: { type: "ERC20", options: { address: token.address, symbol: token.symbol, decimals: token.decimals } },
      });
      toast.success(`${token.symbol} added on ${networkName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add token");
    }
  }

  async function onMint() {
    if (onChain && !wallet) {
      toast.message(`Connect a wallet on ${networkName}.`);
      return;
    }
    if (!user && !wallet) {
      toast.message("Connect a wallet first.");
      return;
    }
    if (!token || !plan || !inRange) {
      toast.error("Stake is outside this seam's range.");
      return;
    }
    if (onChain && plan.onChainId == null && !catalog?.protocol?.planIds[plan.id]) {
      toast.error("This seam is not on the vault yet.");
      return;
    }
    setBusy(true);
    try {
      if (catalog?.protocol) {
        await mint(catalog, token.id, plan.id, amountInput);
        setBurst(true);
        toast.success("Shaft sunk on-chain");
        window.setTimeout(() => router.push("/app"), 700);
        return;
      }
      if (!user) {
        toast.message("Sign in or connect a wallet first.");
        return;
      }
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: token.id, planId: plan.id, principalAmount: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mint failed");
      setBurst(true);
      toast.success(`Shaft #${String(data.position.tokenId).padStart(4, "0")} is open`);
      window.setTimeout(() => router.push(`/app/position/${data.position.tokenId}`), 700);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mint failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ConfettiBurst fire={burst} />

      <Wipe>
        <div className="flex items-center gap-4">
          <span className="tag whitespace-nowrap">Sink</span>
          <span className="h-px flex-1 bg-[var(--rule)]" />
          <span className="tag whitespace-nowrap">{onChain ? networkName : "Off-chain preview"}</span>
        </div>
        <h1 className="display mt-5 text-[clamp(2rem,4.6vw,3rem)]">Open a shaft.</h1>
        <p className="mt-3 max-w-xl text-[0.9rem] leading-relaxed text-bone-2">
          {onChain
            ? `Your wallet mints the position on ${networkName}. Approve the asset, then confirm the sink.`
            : "The plate on the right is the position you will own. Coupon starts running the second it mints."}
        </p>
      </Wipe>

      {onChain ? (
        <div className="panel mt-8 flex flex-col gap-3 bg-[#0b0b0c] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.85rem] text-bone-2">
            {wallet
              ? `Connected ${formatAddress(wallet)} on ${networkName}.${canFaucet ? " Fund test balances, then add the asset to your wallet." : ""}`
              : `Connect a wallet on ${networkName} (chain ${catalog?.network.chainId}).`}
          </p>
          <div className="flex flex-wrap gap-2">
            {!wallet ? <WalletButton /> : null}
            {canFaucet ? (
              <button type="button" className="act act-line h-10" disabled={!wallet || funding} onClick={() => void fundWallet()}>
                <span>{funding ? "Funding…" : "Fund wallet"}</span>
              </button>
            ) : null}
            <button type="button" className="act act-line h-10" disabled={!token} onClick={() => void addTokenToWallet()}>
              <span>Add {token?.symbol ?? "asset"}</span>
            </button>
          </div>
        </div>
      ) : !user ? (
        <div className="mt-8">
          <Link href="/login" className="act act-line">
            <span>Sign in to sink</span>
          </Link>
        </div>
      ) : null}

      <div className="mt-10 grid gap-px bg-[var(--rule)] lg:grid-cols-[1.15fr_.85fr]">
        <Wipe className="bg-[#0b0b0c] p-6 lg:p-8">
          <Step n="01" label="Asset" />
          {tokens.length === 0 && onChain ? (
            <p className="num mt-3 text-[11px] text-ember">
              NO ASSETS BOUND ON {networkName.toUpperCase()} — DEPLOY OR PASTE ADDRESSES IN ADMIN → SETTINGS.
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-px bg-[var(--rule)] sm:grid-cols-4">
            {tokens.map((item) => {
              const on = (assetId ?? tokens[0]?.id) === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setAssetId(item.id);
                    if (item.id === "usdt" || item.id === "usdc") setAmountInput("250");
                    if (item.id === "weth") setAmountInput("0.4");
                    if (item.id === "wbtc") setAmountInput("0.01");
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 transition-colors",
                    on ? "bg-[var(--slate-2)]" : "bg-[#0b0b0c] hover:bg-[var(--slate)]",
                  )}
                >
                  <TokenMark id={item.id} symbol={item.symbol} size={28} />
                  <span className="num text-[10px] tracking-[0.1em]">{item.symbol}</span>
                  <span className="num text-[9px] text-bone-3">{formatUsd(item.priceUsd, 0)}</span>
                </button>
              );
            })}
          </div>

          <Step n="02" label="Seam" className="mt-10" />
          <div className="mt-4 grid gap-px bg-[var(--rule)] sm:grid-cols-3">
            {plans.map((item) => {
              const s = seamOf(item.id, item.lockSeconds);
              const on = (planId ?? plans[1]?.id ?? plans[0]?.id) === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlanId(item.id)}
                  className={cn("p-4 text-left transition-colors", on ? "bg-[var(--slate-2)]" : "bg-[#0b0b0c] hover:bg-[var(--slate)]")}
                >
                  <span className="num block text-[10px] tracking-[0.14em]" style={{ color: on ? s.color : "var(--bone-3)" }}>
                    SEAM {s.index}
                  </span>
                  <span className="display mt-2 block text-xl">{s.name}</span>
                  <span className="num mt-2 block text-sm" style={{ color: s.color }}>
                    {gradeLabel(item.apyBps)}%
                  </span>
                  <span className="num mt-1 block text-[10px] text-bone-3">
                    {Math.round(item.lockSeconds / 86400)} D · {s.depth}
                  </span>
                </button>
              );
            })}
          </div>

          {token && plan ? (
            <>
              <Step n="03" label={`Stake in ${token.symbol}`} className="mt-10" />
              <label className="field mt-4">
                <input inputMode="decimal" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
              </label>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className={cn("num text-[10px] tracking-[0.1em]", inRange ? "text-bone-3" : "text-ember")}>
                  ≈ {formatUsd(usd)} · RANGE {formatUsd(plan.minUsd, 0)}–{formatUsd(plan.maxUsd, 0)}
                </span>
                {balance != null ? (
                  <button
                    type="button"
                    onClick={() => setAmountInput(String(balance))}
                    className="num text-[10px] tracking-[0.1em] text-bone-3 underline-offset-4 hover:text-flux hover:underline"
                  >
                    WALLET {formatTokenAmount(balance, token.symbol)}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {plan && token && usd > 0 ? (
            <>
              <Step n="04" label="If you hold to the date" className="mt-10" />
              <div className="mt-4 border border-[var(--rule)] p-5">
                <p className="num text-3xl" style={{ color: seam.color }}>
                  {formatTokenAmount(earned, token.symbol)}
                </p>
                <dl className="mt-4">
                  <Row label="Per day" value={formatTokenAmount(daily, token.symbol)} />
                  <Row label="Coupon value" value={formatUsd(earned * token.priceUsd)} />
                  <Row label="Abandon fee" value={formatFee(plan.emergencyFeeBps)} />
                </dl>
              </div>
            </>
          ) : null}

          <button type="button" className="act act-solid mt-8 w-full" onClick={() => void onMint()} disabled={busy || !inRange}>
            <span>
              {busy
                ? onChain
                  ? "Confirm in wallet…"
                  : "Sinking…"
                : onChain
                  ? "Approve and sink"
                  : `Sink to ${plan ? seam.name : "seam"}`}
            </span>
            <ArrowDown className="size-3.5" />
          </button>
        </Wipe>

        <Wipe delay={0.1} className="bg-[#0b0b0c] p-6 lg:p-8">
          <p className="tag">Live plate</p>
          <div className="mt-4">{preview ? <PositionCard view={preview} featured /> : null}</div>

          <div className="mt-8 grid grid-cols-[92px_1fr] gap-6 border-t border-[var(--rule)] pt-8">
            <div>
              <p className="tag mb-4">Depth</p>
              <DepthRule active={plan?.id} height={230} />
            </div>
            <div>
              <p className="tag">Seam {seam.index}</p>
              <p className="display mt-2 text-2xl" style={{ color: seam.color }}>
                {seam.name}
              </p>
              <p className="mt-3 text-[0.82rem] leading-relaxed text-bone-2">{seam.note}</p>
              <p className="num mt-4 text-[10px] leading-relaxed tracking-[0.1em] text-bone-3">
                MATRIX · {seam.matrix.toUpperCase()}
                <br />
                BAND · {seam.depth}
              </p>
            </div>
          </div>
        </Wipe>
      </div>
    </div>
  );
}

function Step({ n, label, className }: { n: string; label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="num text-[10px] tracking-[0.24em] text-flux">{n}</span>
      <span className="tag">{label}</span>
      <span className="h-px flex-1 bg-[var(--rule)]" />
    </div>
  );
}
