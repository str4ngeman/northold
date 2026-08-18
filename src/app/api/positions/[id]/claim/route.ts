import { NextResponse } from "next/server";

import { json, requireUser } from "@/lib/api-guard";
import { mapPlan, mapToken } from "@/lib/map-catalog";
import { mapPosition } from "@/lib/map-position";
import { accruedReward, claimableReward, elapsedSeconds } from "@/lib/math";
import { Plan } from "@/lib/models/plan";
import { Position } from "@/lib/models/position";
import { Token } from "@/lib/models/token";

type Ctx = { params: Promise<{ id: string }> };

async function loadOwned(userId: unknown, id: string) {
  const tokenId = Number(id);
  const row = await Position.findOne({ tokenId, userId });
  if (!row) return null;
  const [tokenDoc, planDoc] = await Promise.all([
    Token.findOne({ slug: row.assetId }),
    Plan.findOne({ slug: row.planId }),
  ]);
  if (!tokenDoc || !planDoc) return null;
  const token = mapToken(tokenDoc);
  const plan = mapPlan(planDoc);
  return { row, token, plan, nft: mapPosition(row) };
}

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const loaded = await loadOwned(auth.user._id, id);
  if (!loaded) return NextResponse.json({ error: "Position not found" }, { status: 404 });
  if (loaded.row.status === "emergencyExited" || loaded.row.status === "unlocked") {
    return NextResponse.json({ error: "This card is no longer accruing" }, { status: 400 });
  }
  const nft = mapPosition(loaded.row);
  const accrued = accruedReward(
    loaded.row.principalAmount,
    loaded.plan.apyBps,
    elapsedSeconds(nft, loaded.plan.lockSeconds, Date.now()),
  );
  const claimed = Number(loaded.row.claimedReward ?? loaded.row.claimedUsdt ?? 0);
  const amount = claimableReward(accrued, claimed, loaded.row.status);
  if (amount <= 0) return NextResponse.json({ error: "Nothing to claim yet" }, { status: 400 });
  loaded.row.claimedReward = claimed + amount;
  loaded.row.claimedUsdt = loaded.row.claimedReward;
  await loaded.row.save();
  return json({ claimed: amount, symbol: loaded.token.symbol, position: mapPosition(loaded.row) });
}
