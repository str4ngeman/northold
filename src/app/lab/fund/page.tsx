"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { toast } from "sonner";

import { LabPage } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { WalletButton } from "@/components/wallet-button";
import { useLabFund } from "@/hooks/use-lab-fund";
import { formatAddress } from "@/lib/format";

const DEFAULTS = {
  eth: "0.02",
  usdt: "10000",
  usdc: "10000",
  weth: "10",
  wbtc: "1",
};

export default function LabFundPage() {
  const { address, isConnected, fund } = useLabFund();
  const [to, setTo] = useState("");
  const [eth, setEth] = useState(DEFAULTS.eth);
  const [tokens, setTokens] = useState({ ...DEFAULTS });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);

  useEffect(() => {
    if (address && !to) setTo(address);
  }, [address, to]);

  async function send() {
    if (!isAddress(to)) {
      toast.error("Paste a Sepolia address");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const sent = await fund({
        to,
        eth,
        tokens: { usdt: tokens.usdt, usdc: tokens.usdc, weth: tokens.weth, wbtc: tokens.wbtc },
      });
      setResult(sent);
      toast.success("Sent from the connected MetaMask wallet");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fund failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <LabPage
      kicker="Fund"
      title="Send test funds"
      body="Mints Sepolia mock tokens from the connected MetaMask wallet. ETH is sent from that same wallet — keep the amount small."
    >
      <Surface className="mt-4 max-w-xl p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">From</p>
        <p className="mt-2 font-mono text-sm">
          {address ? formatAddress(address) : "Connect MetaMask"}
        </p>
        {!isConnected ? (
          <div className="mt-4">
            <WalletButton />
          </div>
        ) : null}

        <label className="field mt-5">
          <span>Destination</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x…"
            className="font-mono"
          />
        </label>

        <label className="field mt-5">
          <span>ETH</span>
          <input value={eth} onChange={(e) => setEth(e.target.value)} />
        </label>
        {(["usdt", "usdc", "weth", "wbtc"] as const).map((slug) => (
          <label key={slug} className="field mt-3">
            <span>{slug.toUpperCase()}</span>
            <input
              value={tokens[slug]}
              onChange={(e) => setTokens((prev) => ({ ...prev, [slug]: e.target.value }))}
            />
          </label>
        ))}

        <CtaButton className="mt-6" disabled={busy || !isConnected} onClick={() => void send()}>
          {busy ? "Sending…" : "Fund"}
        </CtaButton>
        {result?.length ? (
          <p className="mt-3 text-sm text-[var(--gain)]">{result.join(" · ")}</p>
        ) : null}
      </Surface>
    </LabPage>
  );
}
