"use client";

import { useEffect, useState } from "react";

import { LabPage, LogPane } from "@/components/lab/ui";
import { WalletButton } from "@/components/wallet-button";
import { CtaButton } from "@/components/ui/cta-button";
import { useLabDeploy } from "@/hooks/use-lab-deploy";
import { useLabExec } from "@/hooks/use-lab-exec";
import { useLabState } from "@/hooks/use-lab-state";
import { formatAddress } from "@/lib/format";

type Seed = {
  plans?: { slug: string }[];
  tokens?: { symbol: string; address: string }[];
  referralBps?: number;
};

export default function LabDeployPage() {
  const { state, refresh } = useLabState(0);
  const { lines: buildLines, running: building, run } = useLabExec();
  const { address, isConnected, run: deployFromWallet } = useLabDeploy();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [deploying, setDeploying] = useState(false);
  const contracts = state?.deployment?.contracts;

  useEffect(() => {
    void fetch("/api/lab/plan-seed")
      .then((r) => r.json())
      .then((data) => setSeed(data as Seed));
  }, []);

  async function deploy() {
    setDeploying(true);
    const log: string[] = [];
    const push = (line: string) => {
      log.push(line);
      setLines([...log]);
    };
    try {
      await deployFromWallet(push);
      await refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  const running = building || deploying;
  const logLines = deploying || lines.length ? lines : buildLines;

  return (
    <LabPage
      kicker="Deploy"
      title="Protocol"
      body="Deploys oracle, card, vault, and lens. Wires plans and the token addresses already in Admin. Does not deploy or mint ERC-20s."
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm text-[var(--ink-2)]">
          {address ? formatAddress(address) : "No wallet"}
        </span>
        {!isConnected ? <WalletButton /> : null}
        <CtaButton disabled={running} onClick={() => void run("build")}>
          Build
        </CtaButton>
        <CtaButton disabled={running || !isConnected} onClick={() => void deploy()}>
          {deploying ? "Deploying…" : "Deploy"}
        </CtaButton>
      </div>
      <p className="mt-2 text-xs text-[var(--ink-3)]">
        {(seed?.tokens?.length ?? 0) === 0
          ? "No catalog tokens with addresses."
          : `${seed?.tokens?.map((t) => t.symbol).join(" · ")} · ${seed?.plans?.length ?? 0} plans`}
        {typeof seed?.referralBps === "number" ? ` · referral ${seed.referralBps / 100}%` : ""}
      </p>
      {contracts?.vault ? (
        <p className="mt-2 font-mono text-xs text-[var(--ink-3)]">vault {formatAddress(contracts.vault)}</p>
      ) : null}

      <div className="mt-5">
        <LogPane lines={logLines} running={running} />
      </div>
    </LabPage>
  );
}
