import { requireLab, labJson } from "@/lib/lab/guard";
import { buildPlanSeed } from "@/lib/lab/plan-seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;
  try {
    const seed = await buildPlanSeed();
    return labJson({ ok: true, ...seed });
  } catch (err) {
    return labJson({ error: err instanceof Error ? err.message : "seed failed" }, 500);
  }
}
