import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { labUiFromRequest } from "@/lib/lab-surface-server";

export async function requireLab() {
  if (!(await labUiFromRequest())) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (process.env.NODE_ENV !== "production") return { ok: true as const };
  const auth = await requireAdmin();
  if ("error" in auth) return auth;
  return { ok: true as const, user: auth.user };
}

export function labJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
