import { NextResponse } from "next/server";

import { json, requireUser } from "@/lib/api-guard";
import { mapPlan, mapToken } from "@/lib/map-catalog";
import { mapPosition } from "@/lib/map-position";
import { accruedUsdt, buildPositionView, claimableUsdt, elapsedSeconds, principalUsd } from "@/lib/math";
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
  const view = buildPositionView(mapPosition(row), token, plan, Date.now());
  return { row, token, plan, view };
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
  const usd = principalUsd(loaded.row.principalAmount, loaded.token.priceUsd);
  const accrued = accruedUsdt(
    usd,
    loaded.plan.apyBps,
    elapsedSeconds(mapPosition(loaded.row), loaded.plan.lockSeconds, Date.now()),
  );
  const amount = claimableUsdt(accrued, loaded.row.claimedUsdt, loaded.row.status);
  if (amount <= 0) return NextResponse.json({ error: "Nothing to claim yet" }, { status: 400 });
  loaded.row.claimedUsdt += amount;
  await loaded.row.save();
  return json({ claimed: amount, position: mapPosition(loaded.row) });
}
