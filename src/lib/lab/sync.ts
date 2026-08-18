import { createPublicClient, getAddress, isAddress, http, type Abi, type Address } from "viem";

import { connectDb } from "@/lib/db";
import { loadArtifact, readDeployment, type Deployment } from "@/lib/lab/paths";
import { Plan } from "@/lib/models/plan";
import { getActiveNetworkId, getRuntimeNetwork, patchNetworkProfile, switchActiveNetwork } from "@/lib/network-store";
import { networkIdFromChainId, viemChain, type NetworkId, type NetworkTokenMap } from "@/lib/networks";

export async function saveWalletDeployment(input: {
  deployer: string;
  chainId: number;
  rpc?: string;
  contracts: Deployment["contracts"];
  plans: { id: number; slug: string }[];
}) {
  if (!isAddress(input.deployer)) throw new Error("Deployer is not a valid address");
  const deployer = getAddress(input.deployer);
  await connectDb();
  const networkId: NetworkId = networkIdFromChainId(input.chainId);
  const planIds: Record<string, number> = {};
  for (const plan of input.plans) planIds[plan.slug] = plan.id;

  const tokens: NetworkTokenMap = {
    usdt: { address: input.contracts.usdt, decimals: 6 },
    usdc: { address: input.contracts.usdc, decimals: 6 },
    weth: { address: input.contracts.weth, decimals: 18 },
    wbtc: { address: input.contracts.wbtc, decimals: 8 },
  };

  await switchActiveNetwork(networkId);

  for (const plan of input.plans) {
    await Plan.findOneAndUpdate({ slug: plan.slug }, { $set: { onChainId: plan.id } });
  }

  await patchNetworkProfile(networkId, {
    rpcUrl: input.rpc,
    deployerAddress: deployer,
    vaultAddress: input.contracts.vault,
    cardAddress: input.contracts.card,
    oracleAddress: input.contracts.oracle,
    lensAddress: input.contracts.lens,
    protocolPlans: planIds,
    tokens,
  });

  return {
    vault: input.contracts.vault,
    deployer: deployer as Address,
    tokens: Object.entries(tokens).map(([slug, meta]) => `${slug}=${meta?.address}`),
    plans: planIds,
    chainId: input.chainId,
    networkId,
  };
}

export async function syncDeploymentToDb(chainId?: number) {
  await connectDb();
  const runtime = await getRuntimeNetwork();
  const targetChain = chainId ?? runtime.chainId;
  const networkId: NetworkId = networkIdFromChainId(targetChain);
  const deployment = readDeployment(targetChain);
  if (!deployment) {
    throw new Error(`No deployment file for chain ${targetChain}. Deploy first.`);
  }

  const planIds: Record<string, number> = {};
  for (const plan of deployment.plans) {
    planIds[plan.slug] = plan.id;
  }

  const active = await getActiveNetworkId();
  if (active === networkId) {
    for (const plan of deployment.plans) {
      await Plan.findOneAndUpdate({ slug: plan.slug }, { $set: { onChainId: plan.id } });
    }
  }

  const tokens: NetworkTokenMap = {
    usdt: { address: deployment.contracts.usdt, decimals: 6 },
    usdc: { address: deployment.contracts.usdc, decimals: 6 },
    weth: { address: deployment.contracts.weth, decimals: 18 },
    wbtc: { address: deployment.contracts.wbtc, decimals: 8 },
  };

  const nextTokenId = await readNextTokenId(deployment);
  await patchNetworkProfile(networkId, {
    rpcUrl: deployment.rpc || runtime.rpcUrl,
    vaultAddress: deployment.contracts.vault,
    cardAddress: deployment.contracts.card,
    oracleAddress: deployment.contracts.oracle,
    lensAddress: deployment.contracts.lens,
    protocolPlans: planIds,
    tokens,
    nextTokenId,
    deployerAddress: deployment.deployer,
  });

  return {
    vault: deployment.contracts.vault,
    tokens: Object.entries(tokens).map(([slug, meta]) => `${slug}=${meta?.address}`),
    plans: planIds,
    chainId: deployment.chainId,
    networkId,
    nextTokenId,
  };
}

async function readNextTokenId(deployment: NonNullable<ReturnType<typeof readDeployment>>) {
  try {
    const pc = createPublicClient({
      chain: viemChain(networkIdFromChainId(deployment.chainId)),
      transport: http(deployment.rpc),
    });
    const next = await pc.readContract({
      address: deployment.contracts.vault,
      abi: loadArtifact("NortholdVault").abi as Abi,
      functionName: "nextTokenId",
    });
    const n = Number(next);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
}
