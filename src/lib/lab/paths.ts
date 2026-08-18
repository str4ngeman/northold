import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const repoRoot = process.cwd();
export const contractsRoot = path.join(repoRoot, "contracts");
export const deploymentsDir = path.join(contractsRoot, "deployments");
export const foundryBin = path.join(os.homedir(), ".foundry", "bin");

export const LAB_COMMANDS = [
  "setup",
  "build",
  "test",
  "coverage",
  "audit",
  "deploy",
  "time",
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
  return JSON.parse(fs.readFileSync(p, "utf8")) as {
    abi: unknown[];
    bytecode: { object: `0x${string}` } | `0x${string}`;
  };
}

export function bytecodeOf(artifact: ReturnType<typeof loadArtifact>): `0x${string}` {
  const b = artifact.bytecode;
  return (typeof b === "string" ? b : b.object) as `0x${string}`;
}

export function readDeployment(chainId: number): Deployment | null {
  const p = path.join(deploymentsDir, `${chainId}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Deployment;
}

export function stripAnsi(text: string) {
  return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
}
