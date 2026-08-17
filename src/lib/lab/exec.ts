import { spawn } from "node:child_process";
import path from "node:path";

import {
  foundryBin,
  LAB_COMMANDS,
  repoRoot,
  stripAnsi,
  type LabCommand,
} from "@/lib/lab/paths";

function foundryEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${foundryBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };
}

export function isLabCommand(value: string): value is LabCommand {
  return (LAB_COMMANDS as readonly string[]).includes(value);
}

export function streamLeague(
  args: string[],
  onLine: (line: string) => void,
  extraEnv: Record<string, string | undefined> = {},
) {
  const tsx = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const script = path.join(repoRoot, "tool", "league.ts");
  const child = spawn(process.execPath, [tsx, script, ...args], {
    cwd: repoRoot,
    env: { ...foundryEnv(), ...extraEnv },
    windowsHide: true,
  });

  const feed = (buf: Buffer) => {
    const text = stripAnsi(buf.toString("utf8"));
    for (const line of text.split("\n")) {
      if (line.length) onLine(line);
    }
  };
  child.stdout?.on("data", feed);
  child.stderr?.on("data", feed);
  return child;
}
