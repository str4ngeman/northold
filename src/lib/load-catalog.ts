import { connectDb } from "@/lib/db";
import { BRAND } from "@/lib/brand";
import { bindAddress } from "@/lib/lab/live-tokens";
import { mapPlan, mapToken } from "@/lib/map-catalog";
import { Plan } from "@/lib/models/plan";
import { Settings } from "@/lib/models/settings";
import { Token } from "@/lib/models/token";
import { getRuntimeNetwork, publicNetworkView } from "@/lib/network-store";
import type { AppNetworkView, Plan as PlanType, ProtocolConfig, Token as TokenType } from "@/lib/types";

export type Catalog = {
  plans: PlanType[];
  tokens: TokenType[];
  protocol: ProtocolConfig | null;
  network: AppNetworkView;
  settings: {
    siteName: string;
    tagline: string;
    rewardSymbol: string;
    referralBps: number;
    supportEnabled: boolean;
    nextTokenId: number;
  };
};

export async function loadCatalog(): Promise<Catalog> {
  await connectDb();
  const [plans, tokens, settings, runtime] = await Promise.all([
    Plan.find().sort({ lockSeconds: 1 }),
    Token.find().sort({ symbol: 1 }),
    Settings.findOne({ key: "app" }),
    getRuntimeNetwork(),
  ]);

  return {
    plans: plans.map((doc) => {
      const plan = mapPlan(doc);
      const onChainId = runtime.protocol?.planIds[plan.id] ?? plan.onChainId;
      return onChainId ? { ...plan, onChainId } : plan;
    }),
    tokens: tokens.map((doc) => {
      const token = mapToken(doc);
      const bound = bindAddress(token.id, token.address, runtime.tokens, runtime.id);
      return {
        ...token,
        address: bound.address,
        decimals: bound.decimals ?? token.decimals,
        network: bound.network,
      };
    }),
    protocol: runtime.protocol,
    network: publicNetworkView(runtime),
    settings: {
      siteName: settings?.siteName ?? BRAND.name,
      tagline: settings?.tagline ?? BRAND.tagline,
      rewardSymbol: settings?.rewardSymbol ?? "asset",
      referralBps: settings?.referralBps ?? 500,
      supportEnabled: settings?.supportEnabled ?? true,
      nextTokenId: runtime.profile.nextTokenId ?? settings?.nextTokenId ?? 1,
    },
  };
}
