import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { Token } from "@/lib/models/token";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await request.json();
  const token = await Token.findByIdAndUpdate(
    id,
    {
      $set: {
        symbol: body.symbol,
        name: body.name,
        address: body.address,
        decimals: Number(body.decimals),
        priceUsd: Number(body.priceUsd),
        color: body.color,
        active: Boolean(body.active),
      },
    },
    { new: true },
  );
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return json({ token });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  await Token.findByIdAndDelete(id);
  return json({ ok: true });
}
