import { json, requireAdmin } from "@/lib/api-guard";
import { loadBusinessReport } from "@/lib/admin/business";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    return json(await loadBusinessReport());
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Could not load business" }, 500);
  }
}
