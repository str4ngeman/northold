"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { toast } from "sonner";

import { LabPage } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { ANVIL_USER, ANVIL_USER_PK } from "@/lib/lab/accounts";

const DEFAULTS = {
  eth: "10",
  usdt: "10000",
  usdc: "10000",
  weth: "10",
  wbtc: "1",
};

export default function LabFundPage() {
  const [to, setTo] = useState("");
  const [eth, setEth] = useState(DEFAULTS.eth);
  const [tokens, setTokens] = useState({ ...DEFAULTS });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);

  async function send() {
    if (!isAddress(to)) {
      toast.error("Paste the MetaMask address from the other browser");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/lab/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          eth,
          tokens: { usdt: tokens.usdt, usdc: tokens.usdc, weth: tokens.weth, wbtc: tokens.wbtc },
        }),
      });
      const data = (await res.json()) as { error?: string; sent?: string[] };
      if (!res.ok) throw new Error(data.error || "Fund failed");
      setResult(data.sent ?? []);
      toast.success("Sent from the Anvil deployer");
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
      body="Anvil only. Push ETH and mock tokens from the local deployer. Sepolia and mainnet use real faucets / real tokens."
    >
      <Surface className="max-w-xl p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Anvil account #1</p>
        <p className="mt-2 break-all font-mono text-xs text-[var(--ink-2)]">{ANVIL_USER}</p>
        <p className="mt-2 break-all font-mono text-[11px] text-[var(--ink-3)]">{ANVIL_USER_PK}</p>
        <p className="mt-2 text-xs text-[var(--ink-3)]">
          Import that key in MetaMask, add chain 31337 → http://127.0.0.1:8545, or paste any address below and fund it.
        </p>
      </Surface>

      <Surface className="mt-4 max-w-xl p-5">
        <label className="field">
          <span>Destination</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x…"
            className="font-mono"
          />
        </label>
        <button
          type="button"
          className="mt-2 text-xs text-[var(--light)]"
          onClick={() => setTo(ANVIL_USER)}
        >
          Fill Anvil account #1
        </button>

        <label className="field mt-5">
          <span>ETH</span>
          <input value={eth} onChange={(e) => setEth(e.target.value)} />
        </label>
        {(["usdt", "usdc", "weth", "wbtc"] as const).map((symbol) => (
          <label key={symbol} className="field mt-3">
            <span>{symbol.toUpperCase()}</span>
            <input
              value={tokens[symbol]}
              onChange={(e) => setTokens({ ...tokens, [symbol]: e.target.value })}
            />
          </label>
        ))}

        <div className="mt-6">
          <CtaButton disabled={busy} onClick={() => void send()}>
            {busy ? "Sending…" : "Send from deployer"}
          </CtaButton>
        </div>
        {result ? (
          <p className="mt-4 text-sm text-[var(--gain)]">{result.join(" · ")}</p>
        ) : null}
      </Surface>
    </LabPage>
  );
}
