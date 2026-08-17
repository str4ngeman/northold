import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { setSessionCookie, toSessionUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/user";
import { makeReferralCode } from "@/lib/referral-code";
import { findReferrer } from "@/lib/users";

export async function POST(request: NextRequest) {
  await connectDb();
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    ref?: string;
  };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || password.length < 8) {
    return NextResponse.json({ error: "Email and a password of 8+ characters are required" }, { status: 400 });
  }
  if (await User.findOne({ email })) {
    return NextResponse.json({ error: "That email is already registered" }, { status: 409 });
  }
  const referrer = await findReferrer(body.ref);
  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(password, 12),
    name: body.name?.trim() || email.split("@")[0],
    role: "user",
    referralCode: makeReferralCode(),
    referredBy: referrer && referrer.email !== email ? referrer._id : undefined,
  });
  const session = toSessionUser(user);
  await setSessionCookie(session);
  return NextResponse.json({ user: session });
}
