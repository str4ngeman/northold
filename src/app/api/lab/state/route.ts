import { requireLab, labJson } from "@/lib/lab/guard";
import { getLabState } from "@/lib/lab/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;
  try {
    return labJson(await getLabState());
  } catch (err) {
    return labJson({ error: err instanceof Error ? err.message : "state failed" }, 500);
  }
}
