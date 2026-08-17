"use client";

import { useState } from "react";

import { LabPage, LogPane } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { useLabExec } from "@/hooks/use-lab-exec";

export default function LabTestPage() {
  const { lines, running, code, run } = useLabExec();
  const [match, setMatch] = useState("");
  const [gas, setGas] = useState(false);

  function testArgs() {
    const args: string[] = [];
    if (match) args.push("--match", match);
    if (gas) args.push("--gas");
    return args;
  }

  return (
    <LabPage
      kicker="Test"
      title="Forge the seals"
      body="Run the Foundry suite, including Pulse / Horizon / Apex time-travel sims."
    >
      <div className="flex max-w-xl flex-col gap-3 sm:flex-row">
        <input
          value={match}
          onChange={(e) => setMatch(e.target.value)}
          placeholder="match test name"
          className="h-12 flex-1 rounded-full bg-white/4 px-4 text-sm outline-none ring-1 ring-white/10 focus:ring-[var(--light)]"
        />
        <label className="flex h-12 items-center gap-2 px-2 text-sm text-[var(--ink-2)]">
          <input type="checkbox" checked={gas} onChange={(e) => setGas(e.target.checked)} />
          Gas report
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <CtaButton disabled={running} onClick={() => void run("test", testArgs())}>
          Run tests
        </CtaButton>
        <CtaButton variant="ghost" disabled={running} onClick={() => void run("coverage")}>
          Coverage
        </CtaButton>
      </div>
      {code !== null ? (
        <p className={`mt-3 text-sm ${code === 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"}`}>
          Exit {code}
        </p>
      ) : null}
      <div className="mt-6">
        <LogPane lines={lines} running={running} />
      </div>
    </LabPage>
  );
}
