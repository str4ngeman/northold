import { NextResponse } from "next/server";

import { json, requireUser } from "@/lib/api-guard";
import { mapPlan, mapToken } from "@/lib/map-catalog";
import { mapPosition } from "@/lib/map-position";
import { buildPositionView, emergencyFeeAmount } from "@/lib/math";
import { Plan } from "@/lib/models/plan";
import { Position } from "@/lib/models/position";
import { Token } from "@/lib/models/token";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const row = await Position.findOne({ tokenId: Number(id), userId: auth.user._id });
  if (!row) return NextResponse.json({ error: "Position not found" }, { status: 404 });
  if (row.status !== "locked") {
    return NextResponse.json({ error: "Emergency release is only available on an active lock" }, { status: 400 });
  }
  const [tokenDoc, planDoc] = await Promise.all([
    Token.findOne({ slug: row.assetId }),
    Plan.findOne({ slug: row.planId }),
  ]);
  if (!tokenDoc || !planDoc) {
    return NextResponse.json({ error: "Catalog missing" }, { status: 400 });
  }
  const plan = mapPlan(planDoc);
  const view = buildPositionView(mapPosition(row), mapToken(tokenDoc), plan, Date.now());
  if (view.isMatured) {
    return NextResponse.json({ error: "This card is already matured" }, { status: 400 });
  }
  const fee = emergencyFeeAmount(row.principalAmount, plan.emergencyFeeBps);
  const forfeited = view.claimableReward;
  row.status = "emergencyExited";
  row.unlockedAt = Date.now();
  await row.save();
  return json({
    returned: row.principalAmount - fee,
    fee,
    forfeited,
    symbol: view.token.symbol,
    position: mapPosition(row),
  });
}
