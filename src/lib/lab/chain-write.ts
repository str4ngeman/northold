import { connectDb } from "@/lib/db";
import { Plan } from "@/lib/models/plan";
import { getRuntimeNetwork, patchNetworkProfile } from "@/lib/network-store";
import type { NetworkId } from "@/lib/networks";
import type { Address } from "viem";

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

export async function rememberPlanId(slug: string, planId: number) {
  await connectDb();
  const runtime = await getRuntimeNetwork();
  await patchNetworkProfile(runtime.id, {
    protocolPlans: { ...(runtime.profile.protocolPlans ?? {}), [slug]: planId },
  });
  await Plan.findOneAndUpdate({ slug }, { $set: { onChainId: planId } });
}
