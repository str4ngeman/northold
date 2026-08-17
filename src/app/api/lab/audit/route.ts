import { staticAudit } from "@/lib/lab/audit";
import { requireLab, labJson } from "@/lib/lab/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;
  return labJson(staticAudit());
}
