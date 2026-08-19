import { json } from "@/lib/api-guard";
import { claimMetadata } from "@/lib/field/serialize";
import { getClaim } from "@/lib/field/store";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const claim = getClaim(Number(id));
  if (!claim) return json({ error: "Not in the register." }, 404);
  const origin = new URL(request.url).origin;
  return json(claimMetadata(claim, origin));
}
