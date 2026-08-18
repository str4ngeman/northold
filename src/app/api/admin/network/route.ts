import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";

import { json, requireAdmin } from "@/lib/api-guard";
import {
  getRuntimeNetwork,
  listNetworkSummaries,
  patchNetworkProfile,
  publicNetworkView,
  switchActiveNetwork,
} from "@/lib/network-store";
import {
  isBlockchainNetworkPinned,
  isNetworkId,
  type NetworkId,
  type NetworkTokenMap,
} from "@/lib/networks";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const [runtime, networks] = await Promise.all([getRuntimeNetwork(), listNetworkSummaries()]);
  return json({
    network: {
      ...publicNetworkView(runtime),
      protocol: runtime.protocol,
      tokens: runtime.tokens,
    },
    networks,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = (await request.json()) as {
    activeNetwork?: string;
    confirmLive?: boolean;
    rpcUrl?: string;
    deployerAddress?: string;
    protocol?: {
      vault?: string;
      card?: string;
      oracle?: string;
      lens?: string;
    };
    tokens?: Record<string, { address?: string; decimals?: number }>;
  };

  const targetId: NetworkId | undefined = isNetworkId(body.activeNetwork) ? body.activeNetwork : undefined;
  const current = await getRuntimeNetwork();
  const id = targetId ?? current.id;

  if (isBlockchainNetworkPinned() && targetId && targetId !== current.id) {
    return NextResponse.json(
      { error: `App network is pinned to ${current.id} by BLOCKCHAIN_NETWORK. Change the env to switch.` },
      { status: 400 },
    );
  }

  if (id === "mainnet" && current.id !== "mainnet" && body.confirmLive !== true) {
    return NextResponse.json(
      { error: "Switching to live mode moves the whole app onto Ethereum mainnet. Confirm to continue." },
      { status: 400 },
    );
  }

  if (targetId && targetId !== current.id) {
    await switchActiveNetwork(targetId);
  }

  const patch: {
    rpcUrl?: string;
    vaultAddress?: string;
    cardAddress?: string;
    oracleAddress?: string;
    lensAddress?: string;
    deployerAddress?: string;
    tokens?: NetworkTokenMap;
  } = {};

  if (typeof body.rpcUrl === "string" && body.rpcUrl.trim()) {
    patch.rpcUrl = body.rpcUrl.trim();
  }

  if (typeof body.deployerAddress === "string" && body.deployerAddress.trim()) {
    if (!isAddress(body.deployerAddress)) {
      return NextResponse.json({ error: "Deployer is not a valid address" }, { status: 400 });
    }
    patch.deployerAddress = getAddress(body.deployerAddress);
  }

  if (body.protocol) {
    for (const [key, value] of Object.entries(body.protocol) as [keyof typeof body.protocol, string | undefined][]) {
      if (!value) continue;
      if (!isAddress(value)) {
        return NextResponse.json({ error: `${key} is not a valid address` }, { status: 400 });
      }
    }
    if (body.protocol.vault) patch.vaultAddress = body.protocol.vault;
    if (body.protocol.card) patch.cardAddress = body.protocol.card;
    if (body.protocol.oracle) patch.oracleAddress = body.protocol.oracle;
    if (body.protocol.lens) patch.lensAddress = body.protocol.lens;
  }

  if (body.tokens) {
    const tokens: NetworkTokenMap = {};
    for (const [slug, meta] of Object.entries(body.tokens)) {
      if (!meta?.address) continue;
      if (!isAddress(meta.address)) {
        return NextResponse.json({ error: `${slug} address is invalid` }, { status: 400 });
      }
      tokens[slug] = {
        address: meta.address as `0x${string}`,
        decimals: Number(meta.decimals) || 18,
      };
    }
    patch.tokens = tokens;
  }

  if (Object.keys(patch).length) {
    await patchNetworkProfile(id, patch);
  }

  const [runtime, networks] = await Promise.all([getRuntimeNetwork(), listNetworkSummaries()]);
  return json({
    network: {
      ...publicNetworkView(runtime),
      protocol: runtime.protocol,
      tokens: runtime.tokens,
    },
    networks,
  });
}
