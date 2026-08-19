import fs from "node:fs";
import path from "node:path";

import { isAddress } from "viem";

import { connectDb } from "@/lib/db";
import { deploymentsDir } from "@/lib/lab/paths";
import type { PlanSeedFile, SeedPlan, SeedToken } from "@/lib/lab/plan-codec";
import { Plan } from "@/lib/models/plan";
import { Settings } from "@/lib/models/settings";
import { Token } from "@/lib/models/token";
import { seedDatabase } from "@/lib/seed";

export const PLAN_SEED_PATH = path.join(deploymentsDir, "plans.seed.json");

const DEFAULT_ORACLE: Record<string, number> = {
  usdt: 1,
  usdc: 1,
  weth: 3500,
  wbtc: 95_000,
};

export async function buildPlanSeed(): Promise<PlanSeedFile> {
  await connectDb();
  await seedDatabase();
  const [plans, tokens, settings] = await Promise.all([
    Plan.find().sort({ lockSeconds: 1 }),
    Token.find().sort({ symbol: 1 }),
    Settings.findOne({ key: "app" }),
  ]);

  const oracle = { ...DEFAULT_ORACLE };
  for (const token of tokens) {
    if (Number.isFinite(token.priceUsd) && token.priceUsd > 0) {
      oracle[token.slug] = token.priceUsd;
    }
  }

  const catalogTokens: SeedToken[] = tokens
    .filter((token) => token.active !== false && isAddress(token.address) && token.address !== "0x0000000000000000000000000000000000000000")
    .map((token) => ({
      slug: token.slug,
      symbol: token.symbol,
      address: token.address as `0x${string}`,
      decimals: token.decimals,
      priceUsd: token.priceUsd,
    }));

  return {
    referralBps: Number(settings?.referralBps ?? 500),
    plans: plans.map(
      (plan): SeedPlan => ({
        slug: plan.slug,
        lockSeconds: plan.lockSeconds,
        minUsd: plan.minUsd,
        maxUsd: plan.maxUsd,
        apyBps: plan.apyBps,
        emergencyFeeBps: plan.emergencyFeeBps,
        active: plan.active !== false,
      }),
    ),
    oracle,
    tokens: catalogTokens,
  };
}

export async function writePlanSeedFromDb(): Promise<PlanSeedFile> {
  const seed = await buildPlanSeed();
  if (!seed.plans.length) {
    throw new Error("No plans in the catalog. Create at least one plan in Admin before deploying.");
  }
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(PLAN_SEED_PATH, `${JSON.stringify(seed, null, 2)}\n`);
  return seed;
}
