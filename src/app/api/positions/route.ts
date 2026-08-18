import { NextRequest, NextResponse } from "next/server";

import { json, requireUser } from "@/lib/api-guard";
import { mapPlan, mapToken } from "@/lib/map-catalog";
import { mapPosition } from "@/lib/map-position";
import {
  principalUsd,
  rarityFrom,
  sizeTierFromUsd,
} from "@/lib/math";
import { Plan } from "@/lib/models/plan";
import { Position } from "@/lib/models/position";
import { Settings } from "@/lib/models/settings";
import { Token } from "@/lib/models/token";
import { getRuntimeNetwork } from "@/lib/network-store";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const rows = await Position.find({ userId: auth.user._id }).sort({ tokenId: -1 });
  return json({ positions: rows.map(mapPosition) });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as {
    assetId?: string;
    planId?: string;
    principalAmount?: number;
  };
  const amount = Number(body.principalAmount);
  if (!body.assetId || !body.planId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid mint payload" }, { status: 400 });
  }

  const [tokenDoc, planDoc, settings, runtime] = await Promise.all([
    Token.findOne({ slug: body.assetId, active: true }),
    Plan.findOne({ slug: body.planId, active: true }),
    Settings.findOne({ key: "app" }),
    getRuntimeNetwork(),
  ]);
  if (!tokenDoc || !planDoc || !settings) {
    return NextResponse.json({ error: "Unknown plan or token" }, { status: 400 });
  }
  if (runtime.protocol) {
    return NextResponse.json(
      { error: "This catalog is on-chain. Connect MetaMask and mint from Earn." },
      { status: 400 },
    );
  }

  const token = mapToken(tokenDoc);
  const plan = mapPlan(planDoc);
  const usd = principalUsd(amount, token.priceUsd);
  if (usd < plan.minUsd || usd > plan.maxUsd) {
    return NextResponse.json({ error: "Amount is outside this plan’s range" }, { status: 400 });
  }

  const owner = auth.user.address || `user:${auth.user._id.toString()}`;
  const tokenId = settings.nextTokenId;
  settings.nextTokenId += 1;
  await settings.save();

  const position = await Position.create({
    tokenId,
    userId: auth.user._id,
    owner,
    assetId: token.id,
    principalAmount: amount,
    planId: plan.id,
    startedAt: Date.now(),
    rarity: rarityFrom(plan.lockSeconds, usd),
    sizeTier: sizeTierFromUsd(usd),
    claimedUsdt: 0,
    claimedReward: 0,
    status: "locked",
  });

  return json({ position: mapPosition(position) }, 201);
}
