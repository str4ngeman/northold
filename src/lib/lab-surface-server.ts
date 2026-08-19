import { headers } from "next/headers";

import { labUiFromEnvAndHost } from "@/lib/lab-surface";

export async function requestHost(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-host") || h.get("host");
}

export async function labUiFromRequest(): Promise<boolean> {
  return labUiFromEnvAndHost(await requestHost());
}
