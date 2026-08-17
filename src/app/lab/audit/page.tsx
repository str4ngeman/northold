"use client";

import { useEffect, useState } from "react";

import { GuardRow, LabPage, LogPane } from "@/components/lab/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { useLabExec } from "@/hooks/use-lab-exec";

type Audit = {
  files: number;
  findings: { file: string; label: string }[];
  owners: string[];
  guards: Record<string, boolean>;
  notes: string[];
};

const GUARD_LABELS: Record<string, string> = {
  reentrancy: "ReentrancyGuard on value moves",
  safeErc20: "SafeERC20 (USDT-safe)",
  ownable2Step: "Ownable2Step",
  depositPause: "Deposit pause",
  frozenApy: "APY frozen at mint",
  rescueReserved: "Rescue cannot pull locked principal",
};

export default function LabAuditPage() {
  const { lines, running, run } = useLabExec();
  const [audit, setAudit] = useState<Audit | null>(null);

  async function load() {
    const res = await fetch("/api/lab/audit");
    setAudit((await res.json()) as Audit);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <LabPage
      kicker="Audit"
      title="Read the privilege surface"
      body="Static pattern scan now. Sizes and storage layout after a forge pass."
    >
      <div className="flex flex-wrap gap-3">
        <CtaButton disabled={running} onClick={() => void load()}>
          Rescan source
        </CtaButton>
        <CtaButton variant="ghost" disabled={running} onClick={() => void run("audit")}>
          Full audit
        </CtaButton>
      </div>

      {audit ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Surface className="p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Guards</p>
            <div className="mt-2">
              {Object.entries(audit.guards).map(([k, ok]) => (
                <GuardRow key={k} ok={ok} label={GUARD_LABELS[k] ?? k} />
              ))}
            </div>
          </Surface>
          <Surface className="p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">onlyOwner</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-2)]">
              {audit.owners.join(" · ") || "—"}
            </p>
            <p className="mt-6 text-xs uppercase tracking-wider text-[var(--ink-3)]">Findings</p>
            {audit.findings.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--gain)]">No tx.origin, selfdestruct, or delegatecall.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-[var(--ink-2)]">
                {audit.findings.map((f, i) => (
                  <li key={`${f.file}-${i}`}>
                    <span className="text-[var(--light)]">{f.label}</span>
                    <span className="text-[var(--ink-3)]"> · {f.file}</span>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </div>
      ) : null}

      <div className="mt-6">
        <LogPane lines={lines} running={running} />
      </div>
    </LabPage>
  );
}
