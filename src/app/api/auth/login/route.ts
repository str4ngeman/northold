import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { setSessionCookie, toSessionUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/user";

export async function POST(request: NextRequest) {
  await connectDb();
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const user = await User.findOne({ email });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (user.banned) {
    return NextResponse.json({ error: "Account is suspended" }, { status: 403 });
  }
  const session = toSessionUser(user);
  await setSessionCookie(session);
  return NextResponse.json({ user: session });
}
