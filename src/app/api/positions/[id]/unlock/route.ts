import { NextResponse } from "next/server";

import { json, requireUser } from "@/lib/api-guard";
import { mapPlan, mapToken } from "@/lib/map-catalog";
import { mapPosition } from "@/lib/map-position";
import { buildPositionView } from "@/lib/math";
import { Plan } from "@/lib/models/plan";
import { Position } from "@/lib/models/position";
import { Token } from "@/lib/models/token";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const tokenId = Number(id);
  const row = await Position.findOne({ tokenId, userId: auth.user._id });
  if (!row) return NextResponse.json({ error: "Position not found" }, { status: 404 });
  const [tokenDoc, planDoc] = await Promise.all([
    Token.findOne({ slug: row.assetId }),
    Plan.findOne({ slug: row.planId }),
  ]);
  if (!tokenDoc || !planDoc) {
    return NextResponse.json({ error: "Catalog missing" }, { status: 400 });
  }
  const view = buildPositionView(mapPosition(row), mapToken(tokenDoc), mapPlan(planDoc), Date.now());
  if (!view.isMatured) {
    return NextResponse.json({ error: "Lock is still active" }, { status: 400 });
  }
  const coupon = view.claimableReward;
  row.claimedReward = view.claimedReward + coupon;
  row.claimedUsdt = row.claimedReward;
  row.status = "unlocked";
  row.unlockedAt = Date.now();
  await row.save();
  return json({
    principal: row.principalAmount,
    reward: coupon,
    symbol: view.token.symbol,
    position: mapPosition(row),
  });
}
