import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import {
  deactivatePlanOnChain,
  decodeChainError,
  loadLiveProtocol,
  rememberPlanId,
  syncPlanToChain,
} from "@/lib/lab/chain-write";
import { validatePlanInput, type SeedPlan } from "@/lib/lab/plan-codec";
import { Plan } from "@/lib/models/plan";

type Ctx = { params: Promise<{ id: string }> };

function seedFrom(plan: InstanceType<typeof Plan>, body: Record<string, unknown>): SeedPlan {
  return {
    slug: plan.slug,
    lockSeconds: Number(body.lockSeconds),
    minUsd: Number(body.minUsd),
    maxUsd: Number(body.maxUsd),
    apyBps: Number(body.apyBps),
    emergencyFeeBps: Number(body.emergencyFeeBps),
    active: Boolean(body.active),
  };
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = (await request.json()) as Record<string, unknown>;
  const current = await Plan.findById(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const seed = seedFrom(current, body);
  const invalid = validatePlanInput(seed);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const protocol = await loadLiveProtocol();
  let chainAction: "add" | "update" | "skipped" = "skipped";
  let onChainId = current.onChainId as number | undefined;
  if (protocol) {
    try {
      const synced = await syncPlanToChain(seed);
      chainAction = synced.action;
      onChainId = synced.planId;
    } catch (err) {
      return NextResponse.json({ error: decodeChainError(err) }, { status: 502 });
    }
  }

  const plan = await Plan.findByIdAndUpdate(
    id,
    {
      $set: {
        name: body.name,
        tagline: body.tagline,
        lockSeconds: seed.lockSeconds,
        minUsd: seed.minUsd,
        maxUsd: seed.maxUsd,
        apyBps: seed.apyBps,
        emergencyFeeBps: seed.emergencyFeeBps,
        active: seed.active,
        ...(onChainId ? { onChainId } : {}),
      },
    },
    { new: true },
  );
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return json({ plan, chain: chainAction });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const plan = await Plan.findById(id);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const protocol = await loadLiveProtocol();
  if (protocol) {
    try {
      await deactivatePlanOnChain(plan.slug, {
        slug: plan.slug,
        lockSeconds: plan.lockSeconds,
        minUsd: plan.minUsd,
        maxUsd: plan.maxUsd,
        apyBps: plan.apyBps,
        emergencyFeeBps: plan.emergencyFeeBps,
        active: false,
      });
      if (plan.onChainId) await rememberPlanId(plan.slug, plan.onChainId);
    } catch (err) {
      return NextResponse.json({ error: decodeChainError(err) }, { status: 502 });
    }
    plan.active = false;
    await plan.save();
    return json({ ok: true, deactivated: true });
  }

  await Plan.findByIdAndDelete(id);
  return json({ ok: true });
}
