import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { loadLiveProtocol, rememberPlanId } from "@/lib/lab/chain-write";
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
  const onChainId =
    typeof body.onChainId === "number" && body.onChainId > 0 ? body.onChainId : (current.onChainId as number | undefined);
  if (protocol && onChainId) await rememberPlanId(current.slug, onChainId);

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
  return json({ plan, vaultLive: Boolean(protocol) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const plan = await Plan.findById(id);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const protocol = await loadLiveProtocol();
  if (protocol && plan.onChainId) {
    plan.active = false;
    await plan.save();
    return json({ ok: true, deactivated: true, vaultLive: true });
  }

  await Plan.findByIdAndDelete(id);
  return json({ ok: true });
}
