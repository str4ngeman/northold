import { json } from "@/lib/api-guard";
import { createClaim, listClaims } from "@/lib/field/store";
import { serializeClaim } from "@/lib/field/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ claims: listClaims().map(serializeClaim) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    siteId?: unknown;
    assetId?: unknown;
    amount?: unknown;
  } | null;

  const siteId = typeof body?.siteId === "string" ? body.siteId : "";
  const assetId = typeof body?.assetId === "string" ? body.assetId : "";
  const amount = Number(body?.amount);

  if (!siteId) return json({ error: "Pick a site on the sheet." }, 400);
  if (!assetId) return json({ error: "Pick an asset." }, 400);

  try {
    const claim = createClaim({ siteId, assetId, amount });
    return json({ claim: serializeClaim(claim) }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Peg failed." }, 400);
  }
}
