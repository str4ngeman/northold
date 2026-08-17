import { requireLab, labJson } from "@/lib/lab/guard";
import { syncDeploymentToDb } from "@/lib/lab/sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;
  try {
    const result = await syncDeploymentToDb();
    return labJson({ ok: true, ...result });
  } catch (err) {
    return labJson({ error: err instanceof Error ? err.message : "sync failed" }, 500);
  }
}
