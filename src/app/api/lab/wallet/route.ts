import type { Address } from "viem";
import { isAddress } from "viem";

import { requireLab, labJson } from "@/lib/lab/guard";
import { getWallet } from "@/lib/lab/state";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!isAddress(address)) {
    return labJson({ error: "Pass a valid address" }, 400);
  }
  try {
    return labJson(await getWallet(address as Address));
  } catch (err) {
    return labJson({ error: err instanceof Error ? err.message : "wallet failed" }, 500);
  }
}
