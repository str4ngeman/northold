import fs from "node:fs";
import path from "node:path";

import {
  erc20Abi,
  formatEther,
  formatUnits,
  parseUnits,
  type Abi,
  type Address,
  type PublicClient,
} from "viem";

import {
  clients,
  fmtTs,
  getTime,
  increaseTime,
  parseDuration,
  rpcUrl,
} from "./lib/chain";
import {
  ANVIL_PK,
  ANVIL_USER_PK,
  bytecodeOf,
  contractsRoot,
  deploymentsDir,
  loadArtifact,
  readDeployment,
  tryReadDeployment,
  writeDeployment,
  type Deployment,
} from "./lib/env";
import {
  bps,
  money,
  progressBar,
  rarityName,
  slugFromBytes32,
  statusName,
  tierName,
  token,
  usd8,
} from "./lib/format";
import {
  anvilStatus,
  captureForge,
  ensureForge,
  runForge,
  startAnvil,
  stopAnvil,
} from "./lib/foundry";

type Flags = Record<string, string | boolean>;

export function parseArgv(argv: string[]) {
  const flags: Flags = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) flags[key] = true;
      else {
        flags[key] = next;
        i++;
      }
    } else rest.push(a);
  }
  return { flags, rest };
}

function flag(flags: Flags, name: string, fallback = "") {
  const v = flags[name];
  return typeof v === "string" ? v : fallback;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function help() {
  console.log(`
Northold protocol tool

Usage:
  npx tsx tool/league.ts <command> [args]

Commands:
  setup                         Check Foundry + contract libraries
  build                         Compile contracts (forge build)
  test         [--match <n>]    Run Foundry tests (includes time-travel)
  coverage                      Forge coverage report
  audit                         Static size, storage, pattern, and privilege scan
  deploy       [--rpc] [--pk] [--reuse-tokens] [--usdt] [--usdc] [--weth] [--wbtc]
                                Deploy protocol. Reuse token addresses on Sepolia/mainnet.
  anvil        start|stop|status
  warp         <30d|12h|90d>    Time-travel the local anvil chain
  time                          Print the current chain timestamp
  sim          [lifecycle|emergency|claims]
  monitor      [--follow]       Snapshot TVL / events (poll with --follow)
  wallet       <address>        Positions, balances, claimable, referrer
  catalog                       Plans, assets, oracle prices

Examples:
  npx tsx tool/league.ts anvil start
  npx tsx tool/league.ts deploy --rpc https://ethereum-sepolia-rpc.publicnode.com --reuse-tokens
  npx tsx tool/league.ts sim lifecycle
  npx tsx tool/league.ts warp 30d
  npx tsx tool/league.ts wallet 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
`);
}

export function cmdSetup() {
  ensureForge();
  const needed = [
    path.join(contractsRoot, "lib/forge-std/src/Test.sol"),
    path.join(contractsRoot, "lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol"),
  ];
  const missing = needed.filter((p) => !fs.existsSync(p));
  if (missing.length) {
    console.error("Missing libraries. From repo root run:");
    console.error("  git clone --depth 1 --branch v1.9.7 https://github.com/foundry-rs/forge-std.git contracts/lib/forge-std");
    console.error("  git clone --depth 1 --branch v5.4.0 https://github.com/OpenZeppelin/openzeppelin-contracts.git contracts/lib/openzeppelin-contracts");
    process.exit(1);
  }
  console.log("Foundry toolchain and libraries OK.");
}

export function cmdBuild() {
  ensureForge();
  runForge(["build"]);
}

export function cmdTest(flags: Flags) {
  ensureForge();
  const args = ["test", "-vv"];
  const match = flag(flags, "match");
  if (match) args.push("--match-test", match);
  if (flags["gas"]) args.push("--gas-report");
  runForge(args);
}

export function cmdCoverage() {
  ensureForge();
  runForge(["coverage"]);
}

export function cmdAudit() {
  ensureForge();
  console.log("\n== Contract sizes ==");
  runForge(["build", "--sizes"]);

  console.log("\n== Storage layout (LeagueVault) ==");
  const layout = captureForge(["inspect", "LeagueVault", "storage-layout"]);
  process.stdout.write(layout.stdout);

  console.log("\n== Pattern scan ==");
  const srcDir = path.join(contractsRoot, "src");
  const files = walkSol(srcDir);
  const findings: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(contractsRoot, file);
    const checks: [RegExp, string][] = [
      [/\btx\.origin\b/, "tx.origin"],
      [/\bselfdestruct\b/, "selfdestruct"],
      [/\bdelegatecall\b/, "delegatecall"],
      [/pragma solidity \^/, "floating pragma"],
      [/\.call\{value/, "low-level value call"],
    ];
    for (const [re, label] of checks) {
      if (re.test(text)) findings.push(`${rel}: ${label}`);
    }
  }
  if (findings.length) {
    for (const f of findings) console.log("  !", f);
  } else {
    console.log("  no tx.origin / selfdestruct / delegatecall / value-call hits");
  }

  console.log("\n== Privilege surface (onlyOwner) ==");
  const vault = fs.readFileSync(path.join(srcDir, "LeagueVault.sol"), "utf8");
  const owners = [...vault.matchAll(/function (\w+)\([^)]*\)[^{]*onlyOwner/g)].map((m) => m[1]);
  console.log(" ", owners.join(", ") || "(none)");

  console.log("\n== Guards ==");
  console.log("  ReentrancyGuard:", /\bnonReentrant\b/.test(vault) ? "yes" : "MISSING");
  console.log("  SafeERC20:", /\bSafeERC20\b/.test(vault) ? "yes" : "MISSING");
  console.log("  Ownable2Step:", /\bOwnable2Step\b/.test(vault) ? "yes" : "MISSING");
  console.log("  deposit pause:", /\bdepositsPaused\b/.test(vault) ? "yes" : "MISSING");
  console.log("  frozen APY at mint:", /\bapyBps:\s*plan\.apyBps/.test(vault) ? "yes" : "MISSING");
  console.log("  rescue reserved check:", /\blockedPrincipal\[token\] \+ protocolFees/.test(vault) ? "yes" : "MISSING");

  console.log("\n== Notes ==");
  console.log("  Coupon USD is frozen at mint (oracle snapshot), matching a sealed card.");
  console.log("  USDT is non-standard ERC-20 in production — SafeERC20 is required.");
  console.log("  Optional: slither .  (pip install slither-analyzer)");
}

function walkSol(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkSol(p));
    else if (ent.name.endsWith(".sol")) out.push(p);
  }
  return out;
}

export async function cmdAnvil(rest: string[]) {
  const sub = rest[0] || "status";
  if (sub === "start") startAnvil();
  else if (sub === "stop") stopAnvil();
  else anvilStatus();
}

export async function cmdDeploy(flags: Flags) {
  ensureForge();
  runForge(["build"]);
  const { publicClient, wallet, account, chainId, url } = await clients({
    rpc: flag(flags, "rpc"),
    pk: flag(flags, "pk"),
  });
  const owner = account.address;
  const publicNet = chainId === 1 || chainId === 11155111;
  if (publicNet && privateKeyIsAnvil(flag(flags, "pk"))) {
    throw new Error("Refusing the well-known Anvil key on a public network. Set PRIVATE_KEY / DEPLOYER_PRIVATE_KEY.");
  }
  console.log(`deploying as ${owner} on chain ${chainId} (${url})`);

  async function deploy(name: string, args: unknown[] = [], file?: string) {
    const art = loadArtifact(name, file);
    const hash = await wallet.deployContract({
      abi: art.abi as Abi,
      bytecode: bytecodeOf(art),
      args,
      account: wallet.account!,
      chain: wallet.chain,
    });
    const rec = await publicClient.waitForTransactionReceipt({ hash });
    if (!rec.contractAddress) throw new Error(`no address for ${name}`);
    console.log(`  ${name.padEnd(14)} ${rec.contractAddress}`);
    return rec.contractAddress as Address;
  }

  const existing = tryReadDeployment(chainId);
  const tokenFlags = {
    usdt: (flag(flags, "usdt") || process.env.USDT_ADDRESS || existing?.contracts.usdt) as Address | undefined,
    usdc: (flag(flags, "usdc") || process.env.USDC_ADDRESS || existing?.contracts.usdc) as Address | undefined,
    weth: (flag(flags, "weth") || process.env.WETH_ADDRESS || existing?.contracts.weth) as Address | undefined,
    wbtc: (flag(flags, "wbtc") || process.env.WBTC_ADDRESS || existing?.contracts.wbtc) as Address | undefined,
  };
  const reuse =
    Boolean(flags["reuse-tokens"]) ||
    chainId === 1 ||
    (chainId === 11155111 && Boolean(tokenFlags.usdt && tokenFlags.usdc && tokenFlags.weth && tokenFlags.wbtc) && flags["fresh-tokens"] !== true);

  if (chainId === 1 && (!tokenFlags.usdt || !tokenFlags.usdc || !tokenFlags.weth || !tokenFlags.wbtc)) {
    throw new Error("Mainnet deploy requires existing token addresses (--usdt --usdc --weth --wbtc).");
  }

  let usdt: Address;
  let usdc: Address;
  let weth: Address;
  let wbtc: Address;
  let mintedMocks = false;
  if (reuse && tokenFlags.usdt && tokenFlags.usdc && tokenFlags.weth && tokenFlags.wbtc) {
    usdt = tokenFlags.usdt;
    usdc = tokenFlags.usdc;
    weth = tokenFlags.weth;
    wbtc = tokenFlags.wbtc;
    console.log("reusing tokens");
    console.log(`  USDT           ${usdt}`);
    console.log(`  USDC           ${usdc}`);
    console.log(`  WETH           ${weth}`);
    console.log(`  WBTC           ${wbtc}`);
  } else {
    if (chainId === 1) throw new Error("Refusing to deploy mock tokens on Ethereum mainnet.");
    usdt = await deploy("MockERC20", ["Tether USD", "USDT", 6], "MockERC20.sol");
    usdc = await deploy("MockERC20", ["USD Coin", "USDC", 6], "MockERC20.sol");
    weth = await deploy("MockERC20", ["Wrapped Ether", "WETH", 18], "MockERC20.sol");
    wbtc = await deploy("MockERC20", ["Wrapped Bitcoin", "WBTC", 8], "MockERC20.sol");
    mintedMocks = true;
  }

  const oracle = await deploy("LeagueOracle", [owner]);
  const card = await deploy("PositionCard", [owner]);
  const vault = await deploy("LeagueVault", [card, usdt, oracle, owner]);
  const lens = await deploy("LeagueLens", [vault]);

  const write = async (address: Address, name: string, fn: string, args: unknown[]) => {
    const art = loadArtifact(name);
    const hash = await wallet.writeContract({
      address,
      abi: art.abi as Abi,
      functionName: fn,
      args,
      account: wallet.account!,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  };

  await write(card, "PositionCard", "setMinter", [vault]);

  const seed = loadPlanSeed();
  console.log(`seeding ${seed.plans.length} plan(s) from ${seed.plans.map((p) => p.slug).join(", ")}`);

  await write(oracle, "LeagueOracle", "setPrice", [usdt, usdToUsd8(seed.oracle.usdt ?? 1)]);
  await write(oracle, "LeagueOracle", "setPrice", [usdc, usdToUsd8(seed.oracle.usdc ?? 1)]);
  await write(oracle, "LeagueOracle", "setPrice", [weth, usdToUsd8(seed.oracle.weth ?? 3500)]);
  await write(oracle, "LeagueOracle", "setPrice", [wbtc, usdToUsd8(seed.oracle.wbtc ?? 95_000)]);

  for (const t of [usdt, usdc, weth, wbtc]) {
    await write(vault, "LeagueVault", "setAsset", [t, true]);
  }

  if (seed.referralBps >= 0 && seed.referralBps <= 2000) {
    await write(vault, "LeagueVault", "setReferralBps", [seed.referralBps]);
  }

  const planIds: { id: number; slug: string }[] = [];
  for (const p of seed.plans) {
    const slug = stringToBytes32(p.slug);
    const hash = await wallet.writeContract({
      address: vault,
      abi: loadArtifact("LeagueVault").abi as Abi,
      functionName: "addPlan",
      args: [
        {
          slug,
          lockSeconds: p.lockSeconds,
          minUsd8: usdToUsd8(p.minUsd),
          maxUsd8: usdToUsd8(p.maxUsd),
          apyBps: p.apyBps,
          emergencyFeeBps: p.emergencyFeeBps,
          active: p.active !== false,
        },
      ],
      account: wallet.account!,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const id = await publicClient.readContract({
      address: vault,
      abi: loadArtifact("LeagueVault").abi as Abi,
      functionName: "planCount",
    });
    planIds.push({ id: Number(id), slug: p.slug });
    console.log(`  plan ${String(id).padStart(2)}  ${p.slug}  ${p.lockSeconds}s  ${p.apyBps}bps`);
  }

  if (mintedMocks) {
    const mockAbi = loadArtifact("MockERC20", "MockERC20.sol").abi as Abi;
    const mintHash = await wallet.writeContract({
      address: usdt,
      abi: mockAbi,
      functionName: "mint",
      args: [owner, parseUnits("10000000", 6)],
      account: wallet.account!,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    const approveHash = await wallet.writeContract({
      address: usdt,
      abi: mockAbi,
      functionName: "approve",
      args: [vault, 2n ** 256n - 1n],
      account: wallet.account!,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    await write(vault, "LeagueVault", "fundRewards", [parseUnits("5000000", 6)]);
  } else {
    console.log("skipped mock mint / fundRewards — using existing tokens. Fund the vault USDT separately.");
  }

  const d: Deployment = {
    chainId,
    rpc: url,
    deployer: owner,
    timestamp: Date.now(),
    contracts: { vault, card, oracle, lens, usdt, usdc, weth, wbtc },
    plans: planIds,
  };
  writeDeployment(d);
  console.log(`\nwrote ${path.relative(process.cwd(), path.join(contractsRoot, "deployments", `${chainId}.json`))}`);
}

function privateKeyIsAnvil(cliPk: string) {
  const raw = (cliPk || process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || ANVIL_PK).toLowerCase();
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  return key === ANVIL_PK.toLowerCase();
}

function usdToUsd8(n: number): bigint {
  return BigInt(Math.round(Number(n) * 1e8));
}

function loadPlanSeed() {
  const day = 86400;
  const fallback = {
    referralBps: 500,
    oracle: { usdt: 1, usdc: 1, weth: 3500, wbtc: 95_000 },
    plans: [
      { slug: "pulse", lockSeconds: 30 * day, minUsd: 100, maxUsd: 10_000, apyBps: 800, emergencyFeeBps: 1500, active: true },
      { slug: "horizon", lockSeconds: 90 * day, minUsd: 250, maxUsd: 25_000, apyBps: 1200, emergencyFeeBps: 1200, active: true },
      { slug: "apex", lockSeconds: 180 * day, minUsd: 500, maxUsd: 50_000, apyBps: 1800, emergencyFeeBps: 1000, active: true },
    ],
  };
  const seedPath = path.join(deploymentsDir, "plans.seed.json");
  if (!fs.existsSync(seedPath)) {
    console.log("no plans.seed.json — using Pulse / Horizon / Apex defaults");
    return fallback;
  }
  const parsed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as Partial<typeof fallback> & {
    plans?: typeof fallback.plans;
    oracle?: Record<string, number>;
  };
  if (!Array.isArray(parsed.plans) || parsed.plans.length === 0) {
    console.log("plans.seed.json is empty — using Pulse / Horizon / Apex defaults");
    return fallback;
  }
  return {
    referralBps: Number(parsed.referralBps ?? 500),
    oracle: { ...fallback.oracle, ...(parsed.oracle ?? {}) },
    plans: parsed.plans,
  };
}

function stringToBytes32(s: string): `0x${string}` {
  const hex = Buffer.from(s, "utf8").toString("hex").padEnd(64, "0");
  return `0x${hex}`;
}

async function ensureLocal(flags: Flags) {
  const url = rpcUrl(flag(flags, "rpc"));
  const local = url.includes("127.0.0.1") || url.includes("localhost");
  try {
    await clients({ rpc: url, pk: flag(flags, "pk") });
  } catch {
    if (!local) throw new Error(`RPC down at ${url}`);
    console.log("RPC down — starting anvil");
    startAnvil();
    for (let i = 0; i < 40; i++) {
      await wait(250);
      try {
        await clients({ rpc: url, pk: flag(flags, "pk") });
        break;
      } catch {
        if (i === 39) throw new Error("anvil did not come up");
      }
    }
  }
  const { chainId } = await clients({ rpc: url, pk: flag(flags, "pk") });
  const existing = tryReadDeployment(chainId);
  if (existing) return existing;
  if (!local) throw new Error(`No deployment for chain ${chainId}. Deploy first.`);
  console.log("No deployment — deploying local protocol");
  await cmdDeploy(flags);
  return readDeployment(chainId);
}

export async function cmdWarp(rest: string[], flags: Flags) {
  const spec = rest[0];
  if (!spec) throw new Error("usage: warp <30d|12h|90d>");
  const seconds = parseDuration(spec);
  const { publicClient, chainId } = await clients({ rpc: flag(flags, "rpc") });
  if (chainId !== 31337) {
    throw new Error(`warp is Anvil-only (got chain ${chainId})`);
  }
  const before = await getTime(publicClient);
  await increaseTime(publicClient, seconds);
  const after = await getTime(publicClient);
  console.log(`warped +${spec} (${seconds}s)`);
  console.log(`  ${fmtTs(before)} → ${fmtTs(after)}`);
}

export async function cmdTime(flags: Flags) {
  const { publicClient, chainId } = await clients({ rpc: flag(flags, "rpc") });
  const ts = await getTime(publicClient);
  const block = await publicClient.getBlockNumber();
  console.log(`chain ${chainId}  block ${block}  ${fmtTs(ts)}  unix=${ts}`);
}

export async function cmdCatalog(flags: Flags) {
  const d = await ensureLocal(flags);
  const { publicClient } = await clients({ rpc: flag(flags, "rpc") || d.rpc });
  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;
  const oracleAbi = loadArtifact("LeagueOracle").abi as Abi;
  const count = (await publicClient.readContract({
    address: d.contracts.vault,
    abi: vaultAbi,
    functionName: "planCount",
  })) as bigint;
  console.log("Plans");
  for (let i = 1n; i <= count; i++) {
    const plan = (await publicClient.readContract({
      address: d.contracts.vault,
      abi: vaultAbi,
      functionName: "plans",
      args: [i],
    })) as {
      slug: `0x${string}`;
      lockSeconds: number;
      minUsd8: bigint;
      maxUsd8: bigint;
      apyBps: number;
      emergencyFeeBps: number;
      active: boolean;
    };
    console.log(
      `  #${i} ${slugFromBytes32(plan.slug).padEnd(8)}  ${plan.lockSeconds / 86400}d  ${bps(plan.apyBps)} APY  fee ${bps(plan.emergencyFeeBps)}  ${money(usd8(plan.minUsd8))}–${money(usd8(plan.maxUsd8))}  ${plan.active ? "live" : "off"}`,
    );
  }
  console.log("\nAssets");
  const labels: [string, Address][] = [
    ["USDT", d.contracts.usdt],
    ["USDC", d.contracts.usdc],
    ["WETH", d.contracts.weth],
    ["WBTC", d.contracts.wbtc],
  ];
  for (const [sym, addr] of labels) {
    const price = (await publicClient.readContract({
      address: d.contracts.oracle,
      abi: oracleAbi,
      functionName: "priceUsd",
      args: [addr],
    })) as bigint;
    console.log(`  ${sym.padEnd(4)}  ${addr}  ${money(usd8(price))}`);
  }
}

export async function cmdWallet(rest: string[], flags: Flags) {
  const d = await ensureLocal(flags);
  const address = (rest[0] || flag(flags, "address")) as Address;
  if (!address) throw new Error("usage: wallet <address>");
  const { publicClient } = await clients({ rpc: flag(flags, "rpc") || d.rpc });
  const eth = await publicClient.getBalance({ address });
  console.log(`Wallet ${address}`);
  console.log(`  ETH   ${formatEther(eth)}`);

  const tokens: [string, Address, number][] = [
    ["USDT", d.contracts.usdt, 6],
    ["USDC", d.contracts.usdc, 6],
    ["WETH", d.contracts.weth, 18],
    ["WBTC", d.contracts.wbtc, 8],
  ];
  for (const [sym, tokenAddr, dec] of tokens) {
    const bal = (await publicClient.readContract({
      address: tokenAddr,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;
    const allowance = (await publicClient.readContract({
      address: tokenAddr,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, d.contracts.vault],
    })) as bigint;
    console.log(
      `  ${sym.padEnd(4)}  ${token(bal, dec, sym).padEnd(28)}  vault allowance ${allowance === 0n ? "0" : allowance === 2n ** 256n - 1n ? "max" : formatUnits(allowance, dec)}`,
    );
  }

  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;
  const lensAbi = loadArtifact("LeagueLens").abi as Abi;
  const ref = (await publicClient.readContract({
    address: d.contracts.vault,
    abi: vaultAbi,
    functionName: "referrerOf",
    args: [address],
  })) as Address;
  console.log(`  referrer  ${ref === "0x0000000000000000000000000000000000000000" ? "—" : ref}`);

  const list = (await publicClient.readContract({
    address: d.contracts.lens,
    abi: lensAbi,
    functionName: "positionsOf",
    args: [address],
  })) as PositionView[];

  if (!list.length) {
    console.log("\n  no position cards");
    return;
  }

  let claimable = 0n;
  console.log(`\n  ${list.length} card(s)`);
  for (const p of list) {
    claimable += p.claimableReward;
    const asset = assetSymbol(d, p.asset);
    console.log(
      `\n  #${p.tokenId}  ${slugFromBytes32(p.planSlug)}  ${statusName(p.status)}  ${rarityName(p.rarity)}/${tierName(p.sizeTier)}`,
    );
    console.log(`    principal  ${formatUnits(p.principal, asset.decimals)} ${asset.symbol}  (${money(usd8(p.principalUsd8))})`);
    console.log(`    coupon     accrued ${formatUnits(p.accruedReward, 6)}  claimed ${formatUnits(p.claimedReward, 6)}  claimable ${formatUnits(p.claimableReward, 6)} USDT`);
    console.log(`    lock       ${progressBar(p.lockProgressBps)}  unlock ${fmtTs(Number(p.unlockAt))}${p.matured ? "  MATURED" : ""}`);
  }
  console.log(`\n  total claimable  ${formatUnits(claimable, 6)} USDT`);
}

type PositionView = {
  tokenId: bigint;
  owner: Address;
  asset: Address;
  principal: bigint;
  principalUsd8: bigint;
  planId: bigint;
  planSlug: `0x${string}`;
  startedAt: bigint;
  unlockAt: bigint;
  unlockedAt: bigint;
  accruedReward: bigint;
  claimedReward: bigint;
  claimableReward: bigint;
  lockSeconds: number;
  apyBps: number;
  emergencyFeeBps: number;
  rarity: number;
  sizeTier: number;
  status: number;
  lockProgressBps: bigint;
  matured: boolean;
};

function assetSymbol(d: Deployment, addr: string) {
  const a = addr.toLowerCase();
  if (a === d.contracts.usdt.toLowerCase()) return { symbol: "USDT", decimals: 6 };
  if (a === d.contracts.usdc.toLowerCase()) return { symbol: "USDC", decimals: 6 };
  if (a === d.contracts.weth.toLowerCase()) return { symbol: "WETH", decimals: 18 };
  if (a === d.contracts.wbtc.toLowerCase()) return { symbol: "WBTC", decimals: 8 };
  return { symbol: addr.slice(0, 8), decimals: 18 };
}

export async function cmdMonitor(flags: Flags) {
  const d = await ensureLocal(flags);
  const { publicClient } = await clients({ rpc: flag(flags, "rpc") || d.rpc });
  await printSnapshot(publicClient, d);
  if (!flags.follow) return;
  console.log("\nwatching Minted / Claimed / Unlocked / EmergencyExited  (ctrl+c to stop)");
  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;
  publicClient.watchContractEvent({
    address: d.contracts.vault,
    abi: vaultAbi,
    onLogs: (logs) => {
      for (const log of logs) {
        const ev = log as { eventName?: string; args?: Record<string, unknown> };
        console.log(`  [${fmtTs(Math.floor(Date.now() / 1000))}] ${ev.eventName}`, ev.args ?? "");
      }
    },
  });
  await new Promise(() => undefined);
}

async function printSnapshot(publicClient: PublicClient, d: Deployment) {
  const lensAbi = loadArtifact("LeagueLens").abi as Abi;
  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;
  const snap = (await publicClient.readContract({
    address: d.contracts.lens,
    abi: lensAbi,
    functionName: "snapshot",
  })) as {
    nextTokenId: bigint;
    planCount: bigint;
    rewardBalance: bigint;
    rewardDecimals: number;
    referralBps: number;
    depositsPaused: boolean;
    exitsPaused: boolean;
  };
  const tokens = [d.contracts.usdt, d.contracts.usdc, d.contracts.weth, d.contracts.wbtc];
  const tvl = (await publicClient.readContract({
    address: d.contracts.lens,
    abi: lensAbi,
    functionName: "tvlUsd8",
    args: [tokens],
  })) as [bigint, bigint[]];
  const lockedUsdt = (await publicClient.readContract({
    address: d.contracts.vault,
    abi: vaultAbi,
    functionName: "lockedPrincipal",
    args: [d.contracts.usdt],
  })) as bigint;

  console.log("LeagueVault snapshot");
  console.log(`  cards minted     ${Number(snap.nextTokenId) - 1}`);
  console.log(`  plans            ${snap.planCount}`);
  console.log(`  coupon treasury  ${formatUnits(snap.rewardBalance, snap.rewardDecimals)} USDT`);
  console.log(`  TVL              ${money(usd8(tvl[0]))}`);
  console.log(`  locked USDT      ${formatUnits(lockedUsdt, 6)}`);
  console.log(`  referral         ${bps(snap.referralBps)}`);
  console.log(`  pauses           deposits=${snap.depositsPaused} exits=${snap.exitsPaused}`);
}

export async function cmdSim(rest: string[], flags: Flags) {
  const scenario = rest[0] || "lifecycle";
  const d = await ensureLocal(flags);
  const user = await clients({ rpc: flag(flags, "rpc") || d.rpc, pk: ANVIL_USER_PK });
  const owner = await clients({ rpc: flag(flags, "rpc") || d.rpc, pk: ANVIL_PK });
  const mockAbi = loadArtifact("MockERC20", "MockERC20.sol").abi as Abi;
  const vaultAbi = loadArtifact("LeagueVault").abi as Abi;

  async function mintUser(tokenAddr: Address, amount: bigint) {
    const hash = await owner.wallet.writeContract({
      address: tokenAddr,
      abi: mockAbi,
      functionName: "mint",
      args: [user.account.address, amount],
      account: owner.wallet.account!,
      chain: owner.wallet.chain,
    });
    await owner.publicClient.waitForTransactionReceipt({ hash });
  }
  async function approve(tokenAddr: Address) {
    const hash = await user.wallet.writeContract({
      address: tokenAddr,
      abi: mockAbi,
      functionName: "approve",
      args: [d.contracts.vault, 2n ** 256n - 1n],
      account: user.wallet.account!,
      chain: user.wallet.chain,
    });
    await user.publicClient.waitForTransactionReceipt({ hash });
  }
  async function writeUser(fn: string, args: unknown[]) {
    const hash = await user.wallet.writeContract({
      address: d.contracts.vault,
      abi: vaultAbi,
      functionName: fn,
      args,
      account: user.wallet.account!,
      chain: user.wallet.chain,
    });
    return user.publicClient.waitForTransactionReceipt({ hash });
  }

  console.log(`scenario: ${scenario}`);
  console.log(`user:     ${user.account.address}`);

  if (scenario === "emergency") {
    await mintUser(d.contracts.usdt, parseUnits("1000", 6));
    await approve(d.contracts.usdt);
    await writeUser("mint", [d.contracts.usdt, 1n, parseUnits("1000", 6), "0x0000000000000000000000000000000000000000"]);
    const id = ((await user.publicClient.readContract({
      address: d.contracts.vault,
      abi: vaultAbi,
      functionName: "nextTokenId",
    })) as bigint) - 1n;
    await increaseTime(user.publicClient, 10 * 86400);
    const due = (await user.publicClient.readContract({
      address: d.contracts.vault,
      abi: vaultAbi,
      functionName: "claimableOf",
      args: [id],
    })) as bigint;
    console.log(`after 10d claimable ${formatUnits(due, 6)} USDT (will be forfeited)`);
    await writeUser("emergencyExit", [id]);
    console.log("emergency exit: 15% fee, coupon forfeited, 85% principal returned");
    await cmdWallet([user.account.address], flags);
    return;
  }

  if (scenario === "claims") {
    await mintUser(d.contracts.usdt, parseUnits("2000", 6));
    await approve(d.contracts.usdt);
    await writeUser("mint", [d.contracts.usdt, 1n, parseUnits("2000", 6), "0x0000000000000000000000000000000000000000"]);
    const id = ((await user.publicClient.readContract({
      address: d.contracts.vault,
      abi: vaultAbi,
      functionName: "nextTokenId",
    })) as bigint) - 1n;
    for (let i = 1; i <= 6; i++) {
      await increaseTime(user.publicClient, 5 * 86400);
      const due = (await user.publicClient.readContract({
        address: d.contracts.vault,
        abi: vaultAbi,
        functionName: "claimableOf",
        args: [id],
      })) as bigint;
      if (due > 0n) {
        await writeUser("claim", [id]);
        console.log(`day ${i * 5}: claimed ${formatUnits(due, 6)} USDT`);
      } else {
        console.log(`day ${i * 5}: nothing to claim`);
      }
    }
    await cmdWallet([user.account.address], flags);
    return;
  }

  await mintUser(d.contracts.usdt, parseUnits("1000", 6));
  await approve(d.contracts.usdt);
  await writeUser("mint", [d.contracts.usdt, 1n, parseUnits("1000", 6), "0x0000000000000000000000000000000000000000"]);
  const id = ((await user.publicClient.readContract({
    address: d.contracts.vault,
    abi: vaultAbi,
    functionName: "nextTokenId",
  })) as bigint) - 1n;
  console.log(`minted Pulse card #${id}  1000 USDT`);
  await increaseTime(user.publicClient, 15 * 86400);
  const mid = (await user.publicClient.readContract({
    address: d.contracts.vault,
    abi: vaultAbi,
    functionName: "claimableOf",
    args: [id],
  })) as bigint;
  await writeUser("claim", [id]);
  console.log(`t+15d claimed ${formatUnits(mid, 6)} USDT (principal still locked)`);
  await increaseTime(user.publicClient, 15 * 86400);
  await writeUser("unlock", [id]);
  console.log("t+30d unlocked — principal returned, residual coupon paid");
  await cmdWallet([user.account.address], flags);
}

export type { Flags };
