"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { toast } from "sonner";

import { LabPage } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { WalletButton } from "@/components/wallet-button";
import { useLabFund } from "@/hooks/use-lab-fund";
import { useLabState } from "@/hooks/use-lab-state";
import { formatAddress } from "@/lib/format";

export default function LabFundPage() {
  const { address, isConnected, fund } = useLabFund();
  const { state } = useLabState(0);
  const assets = state?.assets ?? [];
  const [to, setTo] = useState("");
  const [eth, setEth] = useState("0.02");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (address && !to) setTo(address);
  }, [address, to]);

  async function send() {
    if (!isAddress(to)) {
      toast.error("Paste a destination address");
      return;
    }
    setBusy(true);
    try {
      const sent = await fund({
        to,
        eth,
        tokens: amounts,
        assets: assets.map((a) => ({
          slug: a.slug,
          symbol: a.symbol,
          address: a.address as `0x${string}`,
          decimals: a.decimals,
        })),
      });
      toast.success(sent.join(" · "));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fund failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <LabPage
      kicker="Fund"
      title="Send"
      body="ETH and ERC-20s from the connected wallet. Does not mint."
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[9rem]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">From</p>
          <p className="mt-1 font-mono text-xs">{address ? formatAddress(address) : "—"}</p>
        </div>
        {!isConnected ? <WalletButton /> : null}
        <label className="min-w-[14rem] flex-1">
          <span className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">To</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x…"
            className="mt-1 h-9 w-full rounded-lg bg-white/5 px-2 font-mono text-xs"
          />
        </label>
        <label className="w-24">
          <span className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">ETH</span>
          <input
            value={eth}
            onChange={(e) => setEth(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg bg-white/5 px-2 font-mono text-xs"
          />
        </label>
        {assets.map((a) => (
          <label key={a.slug} className="w-[5.5rem]">
            <span className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">{a.symbol}</span>
            <input
              value={amounts[a.slug] ?? ""}
              onChange={(e) => setAmounts((prev) => ({ ...prev, [a.slug]: e.target.value }))}
              placeholder="0"
              className="mt-1 h-9 w-full rounded-lg bg-white/5 px-2 font-mono text-xs"
            />
          </label>
        ))}
        <CtaButton className="h-9" disabled={busy || !isConnected} onClick={() => void send()}>
          {busy ? "Sending…" : "Send"}
        </CtaButton>
      </div>
    </LabPage>
  );
}
