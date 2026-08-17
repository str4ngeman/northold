import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import {
  decodeChainError,
  loadLiveProtocol,
  setAssetOnChain,
  setOraclePriceOnChain,
} from "@/lib/lab/chain-write";
import { bindAddress } from "@/lib/lab/live-tokens";
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
  const bound = bindAddress(current.slug, current.address, runtime.tokens, runtime.id);
  const priceUsd = Number(body.priceUsd);
  const active = Boolean(body.active);
  const live = runtime.tokens[current.slug];
  const address = live?.address ?? (protocol ? bound.address : String(body.address));
  const decimals = live?.decimals ?? (protocol ? current.decimals : Number(body.decimals));

  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 });
  }

  if (protocol) {
    try {
      if (priceUsd !== current.priceUsd) {
        await setOraclePriceOnChain(address, priceUsd);
      }
      if (active !== current.active) {
        await setAssetOnChain(address, active);
      }
    } catch (err) {
      return NextResponse.json({ error: decodeChainError(err) }, { status: 502 });
    }
  } else if (body.address) {
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
  return json({ token, chain: protocol ? "updated" : "skipped" });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const token = await Token.findById(id);
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [protocol, runtime] = await Promise.all([loadLiveProtocol(), getRuntimeNetwork()]);
  if (protocol) {
    try {
      const bound = bindAddress(token.slug, token.address, runtime.tokens, runtime.id);
      await setAssetOnChain(bound.address, false);
    } catch (err) {
      return NextResponse.json({ error: decodeChainError(err) }, { status: 502 });
    }
    token.active = false;
    await token.save();
    return json({ ok: true, deactivated: true });
  }

  await Token.findByIdAndDelete(id);
  return json({ ok: true });
}
