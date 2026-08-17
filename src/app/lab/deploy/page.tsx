"use client";

import { useEffect, useState } from "react";

import { LabPage, LogPane } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { useLabExec } from "@/hooks/use-lab-exec";
import { useLabState } from "@/hooks/use-lab-state";
import { formatApy, formatLock } from "@/lib/format";

type Seed = {
  plans?: { slug: string; lockSeconds: number; apyBps: number; minUsd: number; maxUsd: number; active: boolean }[];
  referralBps?: number;
};

export default function LabDeployPage() {
  const { state, refresh } = useLabState(0);
  const { lines, running, code, run } = useLabExec();
  const [seed, setSeed] = useState<Seed | null>(null);
  const contracts = state?.deployment?.contracts;

  async function loadSeed() {
    const res = await fetch("/api/lab/plan-seed");
    if (!res.ok) return;
    setSeed((await res.json()) as Seed);
  }

  useEffect(() => {
    void loadSeed();
  }, []);

  async function deploy() {
    if (state?.network?.id === "anvil" && !state?.anvil.running) {
      await run("anvil", ["start"]);
      await new Promise((r) => setTimeout(r, 1500));
    }
    await run("deploy");
    await fetch("/api/lab/sync", { method: "POST" });
    await refresh();
    await loadSeed();
  }

  return (
    <LabPage
      kicker="Deploy"
      title={`Broadcast on ${state?.network?.name ?? "the active chain"}`}
      body={
        state?.network?.id === "mainnet"
          ? "Mainnet reuses the canonical USDT/USDC/WETH/WBTC addresses. It will not deploy mock tokens."
          : state?.network?.id === "sepolia"
            ? "Sepolia deploys mock tokens once, then reuses those addresses for later vault deploys."
            : "Compile and deploy mocks, oracle, NFT, vault, and lens. Plans come from Admin — not hardcoded Pulse/Horizon/Apex."
      }
    >
      <div className="flex flex-wrap gap-3">
        <CtaButton disabled={running} onClick={() => void run("build")}>
          Build
        </CtaButton>
        <CtaButton disabled={running} onClick={() => void deploy()}>
          Deploy {state?.network?.shortLabel ?? state?.network?.id ?? "local"}
        </CtaButton>
        <CtaButton
          variant="ghost"
          disabled={running}
          onClick={() => {
            void (async () => {
              const res = await fetch("/api/lab/sync", { method: "POST" });
              const data = (await res.json()) as { error?: string };
              if (!res.ok) {
                console.error(data.error);
                return;
              }
              await refresh();
            })();
          }}
        >
          Sync addresses to app
        </CtaButton>
      </div>
      {code === 0 ? <p className="mt-3 text-sm text-[var(--gain)]">Last job succeeded.</p> : null}

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
        <LogPane lines={lines} running={running} />
      </div>
    </LabPage>
  );
}
