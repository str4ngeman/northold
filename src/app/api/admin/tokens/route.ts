import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { Token } from "@/lib/models/token";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const tokens = await Token.find().sort({ symbol: 1 });
  return json({
    tokens: tokens.map((t) => ({
      _id: t._id.toString(),
      slug: t.slug,
      symbol: t.symbol,
      name: t.name,
      address: t.address,
      decimals: t.decimals,
      priceUsd: t.priceUsd,
      color: t.color,
      active: t.active,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json();
  const token = await Token.create({
    slug: String(body.slug).toLowerCase(),
    symbol: body.symbol,
    name: body.name,
    address: body.address,
    decimals: Number(body.decimals),
    priceUsd: Number(body.priceUsd),
    color: body.color || "#e2c36d",
    active: body.active !== false,
  });
  return json({ token }, 201);
}
