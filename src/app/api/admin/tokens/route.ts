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

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const [protocol, runtime] = await Promise.all([loadLiveProtocol(), getRuntimeNetwork()]);
  const tokens = await Token.find().sort({ symbol: 1 });
  return json({
    vaultLive: Boolean(protocol),
    network: runtime.id,
    tokens: tokens.map((t) => {
      const bound = bindAddress(t.slug, t.address, runtime.tokens, runtime.id);
      return {
        _id: t._id.toString(),
        slug: t.slug,
        symbol: t.symbol,
        name: t.name,
        address: bound.address,
        decimals: bound.decimals ?? t.decimals,
        priceUsd: t.priceUsd,
        color: t.color,
        active: t.active,
        network: bound.network,
        onVault: Boolean(runtime.tokens[t.slug]?.address && protocol),
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json();
  const priceUsd = Number(body.priceUsd);
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 });
  }
  const token = await Token.create({
    slug: String(body.slug).toLowerCase(),
    symbol: body.symbol,
    name: body.name,
    address: body.address,
    decimals: Number(body.decimals),
    priceUsd,
    color: body.color || "#d9b56a",
    active: body.active !== false,
  });
  const runtime = await getRuntimeNetwork();
  await saveNetworkTokens(runtime.id, {
    ...runtime.tokens,
    [token.slug]: { address: token.address as `0x${string}`, decimals: token.decimals },
  });
  const protocol = await loadLiveProtocol();
  if (protocol) {
    try {
      await setAssetOnChain(token.address, token.active !== false);
      await setOraclePriceOnChain(token.address, priceUsd);
    } catch (err) {
      await Token.findByIdAndDelete(token._id);
      return NextResponse.json({ error: decodeChainError(err) }, { status: 502 });
    }
  }
  return json({ token, chain: protocol ? "updated" : "skipped" }, 201);
}
