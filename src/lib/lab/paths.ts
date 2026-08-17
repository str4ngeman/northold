import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export { ANVIL_RPC } from "@/lib/lab/accounts";

export const repoRoot = process.cwd();
export const contractsRoot = path.join(repoRoot, "contracts");
export const deploymentsDir = path.join(contractsRoot, "deployments");
export const pidFile = path.join(repoRoot, ".anvil.pid");
export const foundryBin = path.join(os.homedir(), ".foundry", "bin");

export const LAB_COMMANDS = [
  "setup",
  "build",
  "test",
  "coverage",
  "audit",
  "deploy",
  "anvil",
  "warp",
  "time",
  "sim",
  "monitor",
  "wallet",
  "catalog",
] as const;

export type LabCommand = (typeof LAB_COMMANDS)[number];

export type Deployment = {
  chainId: number;
  rpc: string;
  deployer: `0x${string}`;
  timestamp: number;
  contracts: {
    vault: `0x${string}`;
    card: `0x${string}`;
    oracle: `0x${string}`;
    lens: `0x${string}`;
    usdt: `0x${string}`;
    usdc: `0x${string}`;
    weth: `0x${string}`;
    wbtc: `0x${string}`;
  };
  plans: { id: number; slug: string }[];
};

export function loadArtifact(contract: string, file = `${contract}.sol`) {
  const p = path.join(contractsRoot, "out", file, `${contract}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${contract} artifact. Run build from the lab.`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as { abi: unknown[] };
}

export function readDeployment(chainId: number): Deployment | null {
  const p = path.join(deploymentsDir, `${chainId}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Deployment;
}

export function anvilPid(): { running: boolean; pid: number | null } {
  if (!fs.existsSync(pidFile)) return { running: false, pid: null };
  const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
  if (!pid) return { running: false, pid: null };
  try {
    process.kill(pid, 0);
    return { running: true, pid };
  } catch {
    return { running: false, pid };
  }
}

export function stripAnsi(text: string) {
  return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
}
