import { connectDb } from "@/lib/db";
import { mapPlan, mapToken } from "@/lib/map-catalog";
import { Plan } from "@/lib/models/plan";
import { Settings } from "@/lib/models/settings";
import { Token } from "@/lib/models/token";
import type { Plan as PlanType, Token as TokenType } from "@/lib/types";

export type Catalog = {
  plans: PlanType[];
  tokens: TokenType[];
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
  const [plans, tokens, settings] = await Promise.all([
    Plan.find({ active: true }).sort({ lockSeconds: 1 }),
    Token.find({ active: true }).sort({ symbol: 1 }),
    Settings.findOne({ key: "app" }),
  ]);
  return {
    plans: plans.map(mapPlan),
    tokens: tokens.map(mapToken),
    settings: {
      siteName: settings?.siteName ?? "Leagueto",
      tagline: settings?.tagline ?? "",
      rewardSymbol: settings?.rewardSymbol ?? "USDT",
      referralBps: settings?.referralBps ?? 500,
      supportEnabled: settings?.supportEnabled ?? true,
      nextTokenId: settings?.nextTokenId ?? 1,
    },
  };
}
