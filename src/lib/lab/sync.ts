import { createPublicClient, http, type Abi } from "viem";

import { connectDb } from "@/lib/db";
import { loadArtifact, readDeployment } from "@/lib/lab/paths";
import { Plan } from "@/lib/models/plan";
import { getActiveNetworkId, getRuntimeNetwork, patchNetworkProfile } from "@/lib/network-store";
import { networkIdFromChainId, viemChain, type NetworkId, type NetworkTokenMap } from "@/lib/networks";

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
      abi: loadArtifact("LeagueVault").abi as Abi,
      functionName: "nextTokenId",
    });
    const n = Number(next);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
}
