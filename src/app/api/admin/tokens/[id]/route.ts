import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { loadLiveProtocol } from "@/lib/lab/chain-write";
import { Token } from "@/lib/models/token";
import { getRuntimeNetwork, saveNetworkTokens } from "@/lib/network-store";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await request.json();
  const current = await Token.findById(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [protocol, runtime] = await Promise.all([loadLiveProtocol(), getRuntimeNetwork()]);
  const priceUsd = Number(body.priceUsd);
  const active = Boolean(body.active);
  const live = runtime.tokens[current.slug];
  const decimals = live?.decimals ?? (protocol ? current.decimals : Number(body.decimals));

  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 });
  }

  if (!protocol && body.address) {
    await saveNetworkTokens(runtime.id, {
      ...runtime.tokens,
      [current.slug]: { address: String(body.address) as `0x${string}`, decimals },
    });
  }

  const token = await Token.findByIdAndUpdate(
    id,
    {
      $set: {
        symbol: body.symbol,
        name: body.name,
        address: protocol ? current.address : String(body.address || current.address),
        decimals,
        priceUsd,
        color: body.color,
        active,
      },
    },
    { new: true },
  );
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return json({ token, vaultLive: Boolean(protocol) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const token = await Token.findById(id);
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const protocol = await loadLiveProtocol();
  if (protocol) {
    token.active = false;
    await token.save();
    return json({ ok: true, deactivated: true, vaultLive: true });
  }

  await Token.findByIdAndDelete(id);
  return json({ ok: true });
}
