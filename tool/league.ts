#!/usr/bin/env node
import {
  cmdAnvil,
  cmdAudit,
  cmdBuild,
  cmdCatalog,
  cmdCoverage,
  cmdDeploy,
  cmdMonitor,
  cmdSetup,
  cmdSim,
  cmdTest,
  cmdTime,
  cmdWallet,
  cmdWarp,
  help,
  parseArgv,
} from "./cmds";

const argv = process.argv.slice(2);
const { flags, rest } = parseArgv(argv);
const cmd = rest[0];

async function main() {
  if (!cmd || cmd === "help" || flags.help) {
    help();
    return;
  }
  const args = rest.slice(1);
  switch (cmd) {
    case "setup":
      cmdSetup();
      break;
    case "build":
    case "compile":
      cmdBuild();
      break;
    case "test":
      cmdTest(flags);
      break;
    case "coverage":
      cmdCoverage();
      break;
    case "audit":
      cmdAudit();
      break;
    case "deploy":
      await cmdDeploy(flags);
      break;
    case "anvil":
      await cmdAnvil(args);
      break;
    case "warp":
    case "time-travel":
      await cmdWarp(args, flags);
      break;
    case "time":
      await cmdTime(flags);
      break;
    case "sim":
    case "simulate":
      await cmdSim(args, flags);
      break;
    case "monitor":
      await cmdMonitor(flags);
      break;
    case "wallet":
      await cmdWallet(args, flags);
      break;
    case "catalog":
      await cmdCatalog(flags);
      break;
    default:
      console.error(`unknown command: ${cmd}`);
      help();
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
