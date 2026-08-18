import fs from "node:fs";
import path from "node:path";

import { contractsRoot } from "@/lib/lab/paths";

type Finding = { file: string; label: string };

function walkSol(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkSol(p));
    else if (ent.name.endsWith(".sol")) out.push(p);
  }
  return out;
}

export function staticAudit() {
  const srcDir = path.join(contractsRoot, "src");
  const files = walkSol(srcDir);
  const findings: Finding[] = [];
  const checks: [RegExp, string][] = [
    [/\btx\.origin\b/, "tx.origin"],
    [/\bselfdestruct\b/, "selfdestruct"],
    [/\bdelegatecall\b/, "delegatecall"],
    [/pragma solidity \^/, "floating pragma"],
    [/\.call\{value/, "low-level value call"],
  ];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(contractsRoot, file).replaceAll("\\", "/");
    for (const [re, label] of checks) {
      if (re.test(text)) findings.push({ file: rel, label });
    }
  }

  const vaultPath = path.join(srcDir, "NortholdVault.sol");
  const vault = fs.existsSync(vaultPath) ? fs.readFileSync(vaultPath, "utf8") : "";
  const owners = [...vault.matchAll(/function (\w+)\([^)]*\)[^{]*onlyOwner/g)].map((m) => m[1]);
  const guards = {
    reentrancy: /\bnonReentrant\b/.test(vault),
    safeErc20: /\bSafeERC20\b/.test(vault),
    ownable2Step: /\bOwnable2Step\b/.test(vault),
    depositPause: /\bdepositsPaused\b/.test(vault),
    frozenApy: /\bapyBps:\s*plan\.apyBps/.test(vault),
    rescueReserved: /\blockedPrincipal\[token\] \+ protocolFees/.test(vault),
  };

  return {
    files: files.length,
    findings,
    owners,
    guards,
    notes: [
      "Coupon USD is frozen at mint (oracle snapshot).",
      "Production USDT is non-standard ERC-20 — SafeERC20 is required.",
      "Run the full audit job for contract sizes and storage layout.",
    ],
  };
}
