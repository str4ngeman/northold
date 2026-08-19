import { requireLab, labJson } from "@/lib/lab/guard";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;
  return labJson(
    { error: "Fund from the connected wallet. The server does not hold a deployer key." },
    400,
  );
}
