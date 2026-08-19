import { getToken } from "@/lib/dummy";
import { json } from "@/lib/api-guard";
import { claimPlateSvg } from "@/lib/field/plate";
import { getClaim } from "@/lib/field/store";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const claim = getClaim(Number(id));
  if (!claim) return json({ error: "Not in the register." }, 404);
  const token = getToken(claim.assetId);
  return new Response(claimPlateSvg(claim, token), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
