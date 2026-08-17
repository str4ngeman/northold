import { spawn, spawnSync, type SpawnSyncOptions } from "node:child_process";
import fs from "node:fs";

import { anvilLog, contractsRoot, exe, foundryBin, pidFile } from "./env";

function envWithFoundry(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${foundryBin}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`,
  };
}

export function run(
  bin: string,
  args: string[],
  opts: SpawnSyncOptions = {},
): number {
  const r = spawnSync(bin, args, {
    cwd: contractsRoot,
    env: envWithFoundry(),
    stdio: "inherit",
    shell: false,
    ...opts,
  });
  if (r.error) throw r.error;
  return r.status ?? 1;
}

export function runForge(args: string[]) {
  const status = run(exe("forge"), args);
  if (status !== 0) process.exit(status);
}

export function captureForge(args: string[]) {
  const r = spawnSync(exe("forge"), args, {
    cwd: contractsRoot,
    env: envWithFoundry(),
    encoding: "utf8",
    shell: false,
  });
  if (r.error) throw r.error;
  return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

export function ensureForge() {
  const r = spawnSync(exe("forge"), ["--version"], { encoding: "utf8" });
  if (r.error || r.status !== 0) {
    throw new Error(
      `forge not found at ${exe("forge")}. Install Foundry from https://github.com/foundry-rs/foundry/releases`,
    );
  }
}

export function startAnvil(port = 8545) {
  if (fs.existsSync(pidFile)) {
    const prev = Number(fs.readFileSync(pidFile, "utf8").trim());
    if (prev && isAlive(prev)) {
      console.log(`anvil already running pid=${prev}`);
      return prev;
    }
  }
  fs.mkdirSync(contractsRoot, { recursive: true });
  const log = fs.openSync(anvilLog, "w");
  const child = spawn(
    exe("anvil"),
    ["--host", "127.0.0.1", "--port", String(port), "--chain-id", "31337"],
    { detached: true, stdio: ["ignore", log, log], env: envWithFoundry(), windowsHide: true },
  );
  if (!child.pid) throw new Error("failed to spawn anvil");
  child.unref();
  fs.writeFileSync(pidFile, String(child.pid));
  console.log(`anvil started pid=${child.pid}  http://127.0.0.1:${port}`);
  return child.pid;
}

export function stopAnvil() {
  if (!fs.existsSync(pidFile)) {
    console.log("anvil is not running");
    return;
  }
  const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
  try {
    process.kill(pid);
    console.log(`anvil stopped pid=${pid}`);
  } catch {
    console.log(`anvil pid ${pid} was not running`);
  }
  fs.rmSync(pidFile, { force: true });
}

export function anvilStatus() {
  if (!fs.existsSync(pidFile)) {
    console.log("anvil: stopped");
    return;
  }
  const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
  console.log(isAlive(pid) ? `anvil: running pid=${pid}` : `anvil: stale pid file (${pid})`);
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
