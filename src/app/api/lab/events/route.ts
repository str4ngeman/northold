import { requireLab, labJson } from "@/lib/lab/guard";
import { getRecentEvents } from "@/lib/lab/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;
  try {
    return labJson(await getRecentEvents());
  } catch (err) {
    return labJson({ error: err instanceof Error ? err.message : "events failed" }, 500);
  }
}
