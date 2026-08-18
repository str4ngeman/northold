"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { erc20Abi, formatUnits } from "viem";
import { useReadContract } from "wagmi";

import { TokenMark } from "@/components/brand/token-mark";
import { PositionCard } from "@/components/dashboard/position-card";
import { ConfettiBurst, FadeIn } from "@/components/motion";
import { CtaButton } from "@/components/ui/cta-button";
import { Hint } from "@/components/ui/hint";
import { Surface } from "@/components/ui/surface";
import { WalletButton } from "@/components/wallet-button";
import { useCatalog } from "@/hooks/use-catalog";
import { useChainHead } from "@/hooks/use-chain-head";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { useVaultTx } from "@/hooks/use-vault-tx";
import { formatAddress, formatApy, formatFee, formatLock, formatTokenAmount, formatUsd } from "@/lib/format";
import { buildPositionView, dailyReward, principalUsd, projectedReward, rarityFrom, sizeTierFromUsd } from "@/lib/math";
import type { PositionNft } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StakePage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[1.75rem] bg-white/5" />}>
      <StakeForm />
    </Suspense>
  );
}

function StakeForm() {
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
      toast.message("Connect MetaMask first.");
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

  async function addTokenToMetaMask() {
    if (!token || !catalog?.protocol) return;
    try {
      await ensureChain(catalog.protocol.chainId);
      const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      if (!eth) throw new Error("MetaMask is not available");
      await eth.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: token.address,
            symbol: token.symbol,
            decimals: token.decimals,
          },
        },
      });
      toast.success(`${token.symbol} added on ${networkName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add token");
    }
  }

  async function onMint() {
    if (onChain && !wallet) {
      toast.message(`Connect MetaMask on ${networkName}.`);
      return;
    }
    if (!user && !wallet) {
      toast.message("Connect MetaMask first.");
      return;
    }
    if (!token || !plan || !inRange) {
      toast.error("Amount is outside this plan’s range.");
      return;
    }
    if (onChain && plan.onChainId == null && !catalog?.protocol?.planIds[plan.id]) {
      toast.error("This plan is not on the vault yet. Deploy from Lab after saving plans.");
      return;
    }
    setBusy(true);
    try {
      if (catalog?.protocol) {
        await mint(catalog, token.id, plan.id, amountInput);
        setBurst(true);
        toast.success("Lock minted on-chain");
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
      toast.success(`Position #${String(data.position.tokenId).padStart(4, "0")} is live`);
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
      <FadeIn>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">Lock</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Set a bearing in under a minute</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-2)]">
          {onChain
            ? `MetaMask mints the position NFT on ${networkName}. Approve the token, then confirm the hold.`
            : "The preview is the position you’ll own. Yield in this token starts the second it mints."}
        </p>
      </FadeIn>

      {onChain ? (
        <Surface className="mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--ink-2)]">
            {wallet
              ? `Connected ${wallet.slice(0, 6)}…${wallet.slice(-4)} on ${networkName}.${canFaucet ? " Fund Sepolia mocks, then add the token in MetaMask." : " Use tokens that exist on this network."}`
              : `Connect MetaMask on ${networkName} (chain ${catalog?.network.chainId}).`}
          </p>
          <div className="flex flex-wrap gap-2">
            {!wallet ? <WalletButton /> : null}
            {canFaucet ? (
              <CtaButton variant="ghost" disabled={!wallet || funding} onClick={() => void fundWallet()}>
                {funding ? "Funding…" : "Fund this wallet"}
              </CtaButton>
            ) : null}
            <CtaButton variant="ghost" disabled={!token} onClick={() => void addTokenToMetaMask()}>
              Add {token?.symbol ?? "token"} to MetaMask
            </CtaButton>
          </div>
        </Surface>
      ) : !user ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <WalletButton />
          <CtaButton href="/login" variant="ghost">
            Email login
          </CtaButton>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Surface className="p-6">
          <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Asset</p>
          {tokens.length === 0 && onChain ? (
            <p className="mt-3 text-sm text-[var(--loss)]">
              No tokens bound on {networkName} yet. Deploy or paste addresses in Admin → Settings.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {tokens.map((item) => (
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
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-left ring-1 ring-white/8 transition",
                  (assetId ?? tokens[0]?.id) === item.id ? "bg-white/10 ring-[var(--light)]/40" : "hover:bg-white/5",
                )}
              >
                <TokenMark id={item.id} symbol={item.symbol} color={item.color} size={36} />
                <span>
                  <span className="block text-sm font-semibold">{item.symbol}</span>
                  <span className="text-xs text-[var(--ink-3)]">
                    {formatUsd(item.priceUsd, 0)}
                    {item.address && item.address !== "0x0000000000000000000000000000000000000000" ? ` · ${formatAddress(item.address)}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-xs uppercase tracking-wider text-[var(--ink-3)]">Bearing</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {plans.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlanId(item.id)}
                className={cn(
                  "rounded-2xl px-3 py-3 text-left ring-1 ring-white/8",
                  (planId ?? plans[1]?.id ?? plans[0]?.id) === item.id ? "bg-white/10 ring-[var(--light)]/40" : "hover:bg-white/5",
                )}
              >
                <span className="block text-sm font-semibold">{item.name}</span>
                <span className="text-xs text-[var(--gain)]">{formatApy(item.apyBps)}</span>
                <span className="mt-1 block text-[11px] text-[var(--ink-3)]">{formatLock(item.lockSeconds)}</span>
              </button>
            ))}
          </div>

          {token && plan && (
            <label className="field mt-6 max-w-none">
              <span>Amount in {token.symbol}</span>
              <input inputMode="decimal" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
              <span className={`text-sm ${inRange ? "text-[var(--ink-3)]" : "text-[var(--loss)]"}`}>
                ≈ {formatUsd(usd)} · min {formatUsd(plan.minUsd, 0)}
                {balance != null ? ` · wallet ${formatTokenAmount(balance, token.symbol)}` : ""}
              </span>
            </label>
          )}

          {plan && usd > 0 && (
            <div className="mt-5 rounded-2xl bg-black/20 p-4">
              <Hint text="Simple interest in the token you lock. It does not compound inside the hold.">
                <span className="text-xs uppercase tracking-wider text-[var(--ink-3)]">If you hold to the date</span>
              </Hint>
              <p className="num mt-1 text-3xl font-semibold text-[var(--gain)]">
                {token ? formatTokenAmount(earned, token.symbol) : formatUsd(earned)}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                {token ? `${formatTokenAmount(daily, token.symbol)} / day` : `${formatUsd(daily)} / day`} · early exit fee{" "}
                {formatFee(plan.emergencyFeeBps)}
              </p>
            </div>
          )}

          <div className="mt-6">
            <CtaButton onClick={() => void onMint()} disabled={busy} className="w-full">
              {busy
                ? onChain
                  ? "Confirm in MetaMask…"
                  : "Opening hold…"
                : onChain
                  ? "Approve and lock"
                  : "Lock and hold north"}
            </CtaButton>
          </div>
        </Surface>

        <FadeIn delay={0.1} className="flex flex-col items-center">
          <p className="mb-3 text-xs uppercase tracking-wider text-[var(--ink-3)]">Live preview</p>
          {preview && <PositionCard view={preview} featured />}
        </FadeIn>
      </div>
    </div>
  );
}
