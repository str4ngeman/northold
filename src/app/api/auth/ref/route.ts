import { NextRequest, NextResponse } from "next/server";

import { BRAND } from "@/lib/brand";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim().toLowerCase();
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BRAND.cookies.referral, code, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
