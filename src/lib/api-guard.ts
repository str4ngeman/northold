import { NextResponse } from "next/server";

import { readSession, type SessionUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/user";

export async function requireUser() {
  await connectDb();
  const session = await readSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }
  const user = await User.findById(session.id);
  if (!user || user.banned) {
    return { error: NextResponse.json({ error: "Account unavailable" }, { status: 401 }) };
  }
  return { user, session };
}

export async function requireAdmin() {
  const result = await requireUser();
  if ("error" in result) return result;
  if (result.session.role !== "admin" && result.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return result;
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export type Authed = { user: InstanceType<typeof User>; session: SessionUser };
