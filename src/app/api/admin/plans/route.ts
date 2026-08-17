import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { Plan } from "@/lib/models/plan";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const plans = await Plan.find().sort({ lockSeconds: 1 });
  return json({
    plans: plans.map((p) => ({
      _id: p._id.toString(),
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      lockSeconds: p.lockSeconds,
      minUsd: p.minUsd,
      maxUsd: p.maxUsd,
      apyBps: p.apyBps,
      emergencyFeeBps: p.emergencyFeeBps,
      active: p.active,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json();
  if (!body.slug || !body.name) {
    return NextResponse.json({ error: "Slug and name required" }, { status: 400 });
  }
  const plan = await Plan.create({
    slug: String(body.slug).toLowerCase(),
    name: body.name,
    tagline: body.tagline ?? "",
    lockSeconds: Number(body.lockSeconds),
    minUsd: Number(body.minUsd),
    maxUsd: Number(body.maxUsd),
    apyBps: Number(body.apyBps),
    emergencyFeeBps: Number(body.emergencyFeeBps),
    active: body.active !== false,
  });
  return json({ plan }, 201);
}
