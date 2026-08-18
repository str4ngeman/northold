"use client";

import { type Abi, type Address, maxUint256, parseUnits } from "viem";
import {
  useAccount,
  useChainId,
  useConfig,
  useSwitchChain,
} from "wagmi";
import { deployContract, readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";

import { decodeChainError } from "@/lib/chain-error";
import { appNetworkId, NETWORKS, networkIdFromChainId, walletAddChainParams } from "@/lib/networks";

type Artifact = { abi: unknown[]; bytecode: `0x${string}` };
type Artifacts = Record<string, Artifact>;

type Seed = {
  plans?: { slug: string; lockSeconds: number; apyBps: number; minUsd: number; maxUsd: number; emergencyFeeBps: number; active: boolean }[];
  referralBps?: number;
  oracle?: Record<string, number>;
};

function usdToUsd8(n: number) {
  return BigInt(Math.round(Number(n) * 1e8));
}

function slugToBytes32(slug: string): `0x${string}` {
  const bytes = new TextEncoder().encode(slug);
  if (bytes.length > 32) throw new Error("Plan slug is longer than 32 bytes");
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").padEnd(64, "0");
  return `0x${hex}`;
}

export function useLabDeploy() {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  async function ensureChain(target: number, rpcUrl?: string) {
    if (chainId === target) return;
    try {
      await switchChainAsync({ chainId: target });
    } catch {
      const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      if (!eth) throw new Error("Connect MetaMask first");
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [walletAddChainParams(networkIdFromChainId(target), rpcUrl)],
      });
      await switchChainAsync({ chainId: target });
    }
  }

  async function wait(hash: `0x${string}`) {
    return waitForTransactionReceipt(config, { hash });
  }

  async function deploy(name: string, artifacts: Artifacts, args: unknown[] = []) {
    const art = artifacts[name];
    if (!art?.bytecode) throw new Error(`Missing ${name} bytecode. Click Build first.`);
    const hash = await deployContract(config, {
      abi: art.abi as Abi,
      bytecode: art.bytecode,
      args,
    });
    const rec = await wait(hash);
    if (!rec.contractAddress) throw new Error(`No address for ${name}`);
    return rec.contractAddress;
  }

  async function write(address: Address, art: Artifact, fn: string, args: unknown[]) {
    const hash = await writeContract(config, {
      address,
      abi: art.abi as Abi,
      functionName: fn,
      args,
    });
    await wait(hash);
  }

  async function run(onLog: (line: string) => void) {
    if (!address) throw new Error("Connect MetaMask first. That wallet becomes the protocol owner.");
    try {
      const [artRes, seedRes, stateRes] = await Promise.all([
      fetch("/api/lab/artifacts"),
      fetch("/api/lab/plan-seed"),
      fetch("/api/lab/state"),
    ]);
    const artData = (await artRes.json()) as { artifacts?: Artifacts; error?: string };
    if (!artRes.ok || !artData.artifacts) throw new Error(artData.error || "Click Build first");
    const seed = (await seedRes.json()) as Seed & { error?: string };
    if (!seedRes.ok) throw new Error(seed.error || "Could not load admin plans");
    const state = (await stateRes.json()) as {
      network?: { chainId: number; rpcUrl?: string };
      rpc?: string;
      deployment?: { contracts?: Record<string, string> } | null;
    };

    const targetChain = state.network?.chainId ?? NETWORKS[appNetworkId()].chainId;
    await ensureChain(targetChain, state.rpc);
    onLog(`deploying as ${address} on chain ${targetChain}`);

    const artifacts = artData.artifacts;
    const existing = state.deployment?.contracts;
    const reuse =
      existing?.usdt && existing.usdc && existing.weth && existing.wbtc
        ? {
            usdt: existing.usdt as Address,
            usdc: existing.usdc as Address,
            weth: existing.weth as Address,
            wbtc: existing.wbtc as Address,
          }
        : null;

    let usdt: Address;
    let usdc: Address;
    let weth: Address;
    let wbtc: Address;
    let mintedMocks = false;
    if (reuse) {
      usdt = reuse.usdt;
      usdc = reuse.usdc;
      weth = reuse.weth;
      wbtc = reuse.wbtc;
      onLog("reusing mock tokens");
    } else {
      usdt = await deploy("MockERC20", artifacts, ["Tether USD", "USDT", 6]);
      onLog(`  USDT ${usdt}`);
      usdc = await deploy("MockERC20", artifacts, ["USD Coin", "USDC", 6]);
      onLog(`  USDC ${usdc}`);
      weth = await deploy("MockERC20", artifacts, ["Wrapped Ether", "WETH", 18]);
      onLog(`  WETH ${weth}`);
      wbtc = await deploy("MockERC20", artifacts, ["Wrapped Bitcoin", "WBTC", 8]);
      onLog(`  WBTC ${wbtc}`);
      mintedMocks = true;
    }

    const oracle = await deploy("NortholdOracle", artifacts, [address]);
    onLog(`  Oracle ${oracle}`);
    const card = await deploy("PositionCard", artifacts, [address]);
    onLog(`  Card ${card}`);
    const vault = await deploy("NortholdVault", artifacts, [card, oracle, address]);
    onLog(`  Vault ${vault}`);
    const lens = await deploy("NortholdLens", artifacts, [vault]);
    onLog(`  Lens ${lens}`);

    await write(card, artifacts.PositionCard, "setMinter", [vault]);

    const oraclePrices = seed.oracle ?? { usdt: 1, usdc: 1, weth: 3500, wbtc: 95_000 };
    await write(oracle, artifacts.NortholdOracle, "setPrice", [usdt, usdToUsd8(oraclePrices.usdt ?? 1)]);
    await write(oracle, artifacts.NortholdOracle, "setPrice", [usdc, usdToUsd8(oraclePrices.usdc ?? 1)]);
    await write(oracle, artifacts.NortholdOracle, "setPrice", [weth, usdToUsd8(oraclePrices.weth ?? 3500)]);
    await write(oracle, artifacts.NortholdOracle, "setPrice", [wbtc, usdToUsd8(oraclePrices.wbtc ?? 95_000)]);

    for (const token of [usdt, usdc, weth, wbtc]) {
      await write(vault, artifacts.NortholdVault, "setAsset", [token, true]);
    }

    const referralBps = Number(seed.referralBps ?? 500);
    if (referralBps >= 0 && referralBps <= 2000) {
      await write(vault, artifacts.NortholdVault, "setReferralBps", [referralBps]);
    }

    const plans = seed.plans ?? [];
    const planIds: { id: number; slug: string }[] = [];
    for (const p of plans) {
      await write(vault, artifacts.NortholdVault, "addPlan", [
        {
          slug: slugToBytes32(p.slug),
          lockSeconds: p.lockSeconds,
          minUsd8: usdToUsd8(p.minUsd),
          maxUsd8: usdToUsd8(p.maxUsd),
          apyBps: p.apyBps,
          emergencyFeeBps: p.emergencyFeeBps,
          active: p.active !== false,
        },
      ]);
      const count = (await readContract(config, {
        address: vault,
        abi: artifacts.NortholdVault.abi as Abi,
        functionName: "planCount",
      })) as bigint;
      planIds.push({ id: Number(count), slug: p.slug });
      onLog(`  plan ${count}  ${p.slug}`);
    }

    if (mintedMocks) {
      const mock = artifacts.MockERC20;
      await write(usdt, mock, "mint", [address, parseUnits("10000000", 6)]);
      await write(usdt, mock, "approve", [vault, maxUint256]);
      await write(vault, artifacts.NortholdVault, "fundRewards", [usdt, parseUnits("5000000", 6)]);
      onLog("funded vault rewards with mock USDT");
    }

    const save = await fetch("/api/lab/deployment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deployer: address,
        chainId: targetChain,
        rpc: state.rpc,
        contracts: { vault, card, oracle, lens, usdt, usdc, weth, wbtc },
        plans: planIds,
      }),
    });
    const saved = (await save.json()) as { error?: string; vault?: string };
    if (!save.ok) throw new Error(saved.error || "Could not save deployer and addresses");
    onLog(`saved deployer ${address}`);
    onLog(`catalog synced  vault=${saved.vault}`);
    return { deployer: address, vault };
    } catch (err) {
      throw new Error(decodeChainError(err));
    }
  }

  return { address, isConnected, chainId, run };
}
