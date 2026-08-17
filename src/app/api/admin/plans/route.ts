import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { decodeChainError, loadLiveProtocol, syncPlanToChain } from "@/lib/lab/chain-write";
import { validatePlanInput, type SeedPlan } from "@/lib/lab/plan-codec";
import { Plan } from "@/lib/models/plan";

function serialize(p: InstanceType<typeof Plan>) {
  return {
    _id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    lockSeconds: p.lockSeconds,
    minUsd: p.minUsd,
    maxUsd: p.maxUsd,
    apyBps: p.apyBps,
    emergencyFeeBps: p.emergencyFeeBps,
    active: p.active !== false,
    onChainId: p.onChainId ?? null,
  };
}

function seedFrom(body: Record<string, unknown>, slug: string): SeedPlan {
  return {
    slug,
    lockSeconds: Number(body.lockSeconds),
    minUsd: Number(body.minUsd),
    maxUsd: Number(body.maxUsd),
    apyBps: Number(body.apyBps),
    emergencyFeeBps: Number(body.emergencyFeeBps),
    active: body.active !== false,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const [plans, protocol] = await Promise.all([Plan.find().sort({ lockSeconds: 1 }), loadLiveProtocol()]);
  return json({
    vaultLive: Boolean(protocol),
    plans: plans.map(serialize),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = (await request.json()) as Record<string, unknown>;
  if (!body.slug || !body.name) {
    return NextResponse.json({ error: "Slug and name required" }, { status: 400 });
  }
  const seed = seedFrom(body, String(body.slug).toLowerCase());
  const invalid = validatePlanInput(seed);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (await Plan.findOne({ slug: seed.slug })) {
    return NextResponse.json({ error: "A plan with that slug already exists" }, { status: 400 });
  }

  const protocol = await loadLiveProtocol();
  let onChainId: number | undefined;
  let chainAction: "add" | "update" | "skipped" = "skipped";
  if (protocol) {
    try {
      const synced = await syncPlanToChain(seed);
      onChainId = synced.planId;
      chainAction = synced.action;
    } catch (err) {
      return NextResponse.json({ error: decodeChainError(err) }, { status: 502 });
    }
  }

  const plan = await Plan.create({
    slug: seed.slug,
    name: body.name,
    tagline: body.tagline ?? "",
    lockSeconds: seed.lockSeconds,
    minUsd: seed.minUsd,
    maxUsd: seed.maxUsd,
    apyBps: seed.apyBps,
    emergencyFeeBps: seed.emergencyFeeBps,
    active: seed.active,
    onChainId,
  });
  return json({ plan: serialize(plan), chain: chainAction }, 201);
}
