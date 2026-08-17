import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(here, "../..");
export const contractsRoot = path.join(repoRoot, "contracts");
export const deploymentsDir = path.join(contractsRoot, "deployments");
export const pidFile = path.join(repoRoot, ".anvil.pid");
export const anvilLog = path.join(repoRoot, ".anvil.log");

export const foundryBin = path.join(os.homedir(), ".foundry", "bin");

export function exe(name: string) {
  const bin = process.platform === "win32" ? `${name}.exe` : name;
  return path.join(foundryBin, bin);
}

export function loadArtifact(contract: string, file = `${contract}.sol`) {
  const p = path.join(contractsRoot, "out", file, `${contract}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing artifact ${p}. Run: npx tsx tool/league.ts build`);
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

export function deploymentPath(chainId: number) {
  return path.join(deploymentsDir, `${chainId}.json`);
}

export function readDeployment(chainId: number): Deployment {
  const p = deploymentPath(chainId);
  if (!fs.existsSync(p)) {
    throw new Error(`No deployment for chain ${chainId}. Run: npx tsx tool/league.ts deploy`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as Deployment;
}

export function tryReadDeployment(chainId: number): Deployment | null {
  const p = deploymentPath(chainId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Deployment;
}

export function writeDeployment(d: Deployment) {
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(deploymentPath(d.chainId), `${JSON.stringify(d, null, 2)}\n`);
}

export const ANVIL_PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
export const ANVIL_USER_PK =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
