import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { decodeChainError } from "@/lib/chain-error";
import { connectDb } from "@/lib/db";
import { ANVIL_PK } from "@/lib/lab/accounts";
import { loadArtifact } from "@/lib/lab/paths";
import { toVaultPlan, usdToUsd8, type SeedPlan } from "@/lib/lab/plan-codec";
import { Plan } from "@/lib/models/plan";
import { getRuntimeNetwork, patchNetworkProfile } from "@/lib/network-store";
import { NETWORKS, viemChain, type NetworkId } from "@/lib/networks";

export { decodeChainError };

export type LiveProtocol = {
  networkId: NetworkId;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  vault: Address;
  oracle: Address;
  lens?: Address;
  card?: Address;
  usdt?: Address;
  usdc?: Address;
  weth?: Address;
  wbtc?: Address;
  planIds: Record<string, number>;
};

export async function loadLiveProtocol(): Promise<LiveProtocol | null> {
  const runtime = await getRuntimeNetwork();
  if (!runtime.protocol) return null;
  return {
    networkId: runtime.id,
    chainId: runtime.chainId,
    rpcUrl: runtime.rpcUrl,
    explorerUrl: runtime.explorerUrl,
    vault: runtime.protocol.vault,
    oracle: runtime.protocol.oracle,
    lens: runtime.protocol.lens,
    card: runtime.protocol.card,
    usdt: runtime.tokens.usdt?.address,
    usdc: runtime.tokens.usdc?.address,
    weth: runtime.tokens.weth?.address,
    wbtc: runtime.tokens.wbtc?.address,
    planIds: runtime.protocol.planIds,
  };
}

function deployerKey(networkId: NetworkId): Hex {
  const raw = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (networkId === "anvil") {
    return (raw || ANVIL_PK) as Hex;
  }
  if (!raw) {
    throw new Error("Set DEPLOYER_PRIVATE_KEY (or PRIVATE_KEY) to write the vault on this network.");
  }
  const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  if (key.toLowerCase() === ANVIL_PK.toLowerCase()) {
    throw new Error("Refusing the well-known Anvil key on a public network.");
  }
  return key;
}

async function ownerClients() {
  const runtime = await getRuntimeNetwork();
  const account = privateKeyToAccount(deployerKey(runtime.id));
  const chain = {
    ...viemChain(runtime.id),
    rpcUrls: { default: { http: [runtime.rpcUrl] } },
  };
  const publicClient = createPublicClient({ chain, transport: http(runtime.rpcUrl) });
  const wallet = createWalletClient({ account, chain, transport: http(runtime.rpcUrl) });
  try {
    const chainId = await publicClient.getChainId();
    if (chainId !== runtime.chainId) {
      throw new Error(`RPC is chain ${chainId}, but the app is on ${NETWORKS[runtime.id].name} (${runtime.chainId}).`);
    }
  } catch (err) {
    if (runtime.id === "anvil") throw new Error("Anvil is not running. Start it from Lab → Chain.");
    throw err instanceof Error ? err : new Error(`Could not reach ${runtime.name} RPC.`);
  }
  return { account, publicClient, wallet, chain, runtime };
}

async function assertContract(address: Address, label: string) {
  const { publicClient } = await ownerClients();
  const code = await publicClient.getCode({ address });
  if (!code || code === "0x") {
    throw new Error(`${label} is not deployed at ${address}.`);
  }
}

async function writeVault(functionName: string, args: unknown[]) {
  try {
    const protocol = await loadLiveProtocol();
    if (!protocol) throw new Error("Vault is not deployed on the active network.");
    await assertContract(protocol.vault, "Vault");
    const { account, publicClient, wallet, chain } = await ownerClients();
    const abi = loadArtifact("LeagueVault").abi as Abi;
    const hash = await wallet.writeContract({
      account,
      chain,
      address: protocol.vault,
      abi,
      functionName,
      args,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return { protocol, publicClient, abi };
  } catch (err) {
    throw new Error(decodeChainError(err));
  }
}

export async function addPlanOnChain(plan: SeedPlan): Promise<number> {
  const { protocol, publicClient, abi } = await writeVault("addPlan", [toVaultPlan(plan)]);
  const count = (await publicClient.readContract({
    address: protocol.vault,
    abi,
    functionName: "planCount",
  })) as bigint;
  return Number(count);
}

export async function updatePlanOnChain(planId: number, plan: SeedPlan) {
  await writeVault("updatePlan", [BigInt(planId), toVaultPlan(plan)]);
}

export async function setReferralBpsOnChain(bps: number) {
  await writeVault("setReferralBps", [bps]);
}

export async function setAssetOnChain(token: string, active: boolean) {
  if (!isAddress(token)) throw new Error("Token address is invalid");
  await writeVault("setAsset", [token as Address, active]);
}

export async function setOraclePriceOnChain(token: string, priceUsd: number) {
  try {
    if (!isAddress(token)) throw new Error("Token address is invalid");
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) throw new Error("Oracle price must be > 0");
    const protocol = await loadLiveProtocol();
    if (!protocol) throw new Error("Vault is not deployed on the active network.");
    await assertContract(protocol.oracle, "Oracle");
    const { account, publicClient, wallet, chain } = await ownerClients();
    const abi = loadArtifact("LeagueOracle").abi as Abi;
    const hash = await wallet.writeContract({
      account,
      chain,
      address: protocol.oracle,
      abi,
      functionName: "setPrice",
      args: [token as Address, usdToUsd8(priceUsd)],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  } catch (err) {
    throw new Error(decodeChainError(err));
  }
}

export async function rememberPlanId(slug: string, planId: number) {
  await connectDb();
  const runtime = await getRuntimeNetwork();
  await patchNetworkProfile(runtime.id, {
    protocolPlans: { ...(runtime.profile.protocolPlans ?? {}), [slug]: planId },
  });
  await Plan.findOneAndUpdate({ slug }, { $set: { onChainId: planId } });
}

export async function syncPlanToChain(plan: SeedPlan): Promise<{ planId: number; action: "add" | "update" }> {
  const protocol = await loadLiveProtocol();
  if (!protocol) throw new Error("Vault is not deployed on the active network.");
  const existing = protocol.planIds[plan.slug];
  if (existing) {
    await updatePlanOnChain(existing, plan);
    await rememberPlanId(plan.slug, existing);
    return { planId: existing, action: "update" };
  }
  const planId = await addPlanOnChain(plan);
  await rememberPlanId(plan.slug, planId);
  return { planId, action: "add" };
}

export async function deactivatePlanOnChain(slug: string, plan: SeedPlan) {
  const protocol = await loadLiveProtocol();
  if (!protocol) return { skipped: true as const };
  const planId = protocol.planIds[slug];
  if (!planId) return { skipped: true as const };
  await updatePlanOnChain(planId, { ...plan, active: false });
  return { skipped: false as const, planId };
}
