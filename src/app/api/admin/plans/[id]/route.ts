import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { Plan } from "@/lib/models/plan";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await request.json();
  const plan = await Plan.findByIdAndUpdate(
    id,
    {
      $set: {
        name: body.name,
        tagline: body.tagline,
        lockSeconds: Number(body.lockSeconds),
        minUsd: Number(body.minUsd),
        maxUsd: Number(body.maxUsd),
        apyBps: Number(body.apyBps),
        emergencyFeeBps: Number(body.emergencyFeeBps),
        active: Boolean(body.active),
      },
    },
    { new: true },
  );
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return json({ plan });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  await Plan.findByIdAndDelete(id);
  return json({ ok: true });
}
