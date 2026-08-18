"use client";

import { useEffect, useState } from "react";

import { LabPage, LogPane } from "@/components/lab/ui";
import { WalletButton } from "@/components/wallet-button";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { useLabDeploy } from "@/hooks/use-lab-deploy";
import { useLabExec } from "@/hooks/use-lab-exec";
import { useLabState } from "@/hooks/use-lab-state";
import { formatApy, formatAddress, formatLock } from "@/lib/format";

type Seed = {
  plans?: { slug: string; lockSeconds: number; apyBps: number; minUsd: number; maxUsd: number; active: boolean }[];
  referralBps?: number;
};

export default function LabDeployPage() {
  const { state, refresh } = useLabState(0);
  const { lines: buildLines, running: building, run } = useLabExec();
  const { address, isConnected, run: deployFromWallet } = useLabDeploy();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [ok, setOk] = useState(false);
  const contracts = state?.deployment?.contracts;
  const storedDeployer = state?.deployment?.deployer;

  async function loadSeed() {
    const res = await fetch("/api/lab/plan-seed");
    if (!res.ok) return;
    setSeed((await res.json()) as Seed);
  }

  useEffect(() => {
    void loadSeed();
  }, []);

  async function deploy() {
    setOk(false);
    setDeploying(true);
    const log: string[] = [];
    const push = (line: string) => {
      log.push(line);
      setLines([...log]);
    };
    try {
      await deployFromWallet(push);
      setOk(true);
      await refresh();
      await loadSeed();
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
      title="Broadcast on Sepolia from MetaMask"
      body="The connected wallet is the protocol owner. Confirm each transaction in MetaMask. Addresses and the deployer are saved to the database."
    >
      <Surface className="mb-6 max-w-xl p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Deployer</p>
        <p className="mt-2 font-mono text-sm text-[var(--ink)]">
          {address ? formatAddress(address) : "Connect MetaMask"}
        </p>
        {storedDeployer && storedDeployer !== "0x0000000000000000000000000000000000000000" ? (
          <p className="mt-2 text-xs text-[var(--ink-3)]">
            Saved in database: {formatAddress(storedDeployer)}
          </p>
        ) : null}
        {!isConnected ? (
          <div className="mt-4">
            <WalletButton />
          </div>
        ) : null}
      </Surface>

      <div className="flex flex-wrap gap-3">
        <CtaButton disabled={running} onClick={() => void run("build")}>
          Build
        </CtaButton>
        <CtaButton disabled={running || !isConnected} onClick={() => void deploy()}>
          {deploying ? "Deploying…" : "Deploy Sepolia"}
        </CtaButton>
      </div>
      {ok ? <p className="mt-3 text-sm text-[var(--gain)]">Deployer and contract addresses saved.</p> : null}

      {seed?.plans?.length ? (
        <Surface className="mt-8 overflow-auto p-2">
          <p className="px-4 pt-3 text-xs uppercase tracking-wider text-[var(--ink-3)]">
            Will seed {seed.plans.length} admin plan{seed.plans.length === 1 ? "" : "s"}
            {typeof seed.referralBps === "number" ? ` · referral ${seed.referralBps / 100}%` : ""}
          </p>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-[var(--ink-3)]">
              <tr>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Lock</th>
                <th className="px-4 py-2 font-medium">APY</th>
              </tr>
            </thead>
            <tbody>
              {seed.plans.map((plan) => (
                <tr key={plan.slug} className="border-t border-white/6">
                  <td className="px-4 py-2 capitalize">
                    {plan.slug}
                    {plan.active ? "" : " (paused)"}
                  </td>
                  <td className="px-4 py-2">{formatLock(plan.lockSeconds)}</td>
                  <td className="num px-4 py-2">{formatApy(plan.apyBps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      ) : (
        <p className="mt-6 text-sm text-[var(--ink-3)]">No admin plans loaded yet.</p>
      )}

      {contracts ? (
        <Surface className="mt-8 overflow-auto p-2">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-[var(--ink-3)]">
              <tr>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Address</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(contracts).map(([name, addr]) => (
                <tr key={name} className="border-t border-white/6">
                  <td className="px-4 py-3 capitalize">{name}</td>
                  <td className="num px-4 py-3 text-[var(--ink-2)]">{addr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      ) : (
        <p className="mt-6 text-sm text-[var(--ink-3)]">No deployment on this chain yet.</p>
      )}

      <div className="mt-6">
        <LogPane lines={logLines} running={running} />
      </div>
    </LabPage>
  );
}
