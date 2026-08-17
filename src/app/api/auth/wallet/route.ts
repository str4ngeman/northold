import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

import { readSession, setSessionCookie, toSessionUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { AuthNonce } from "@/lib/models/nonce";
import { User } from "@/lib/models/user";
import { makeReferralCode } from "@/lib/referral-code";
import { findReferrer } from "@/lib/users";

export async function POST(request: NextRequest) {
  await connectDb();
  const body = (await request.json()) as {
    address?: string;
    signature?: `0x${string}`;
    message?: string;
  };
  const address = body.address?.toLowerCase();
  if (!address || !body.signature || !body.message) {
    return NextResponse.json({ error: "Missing wallet payload" }, { status: 400 });
  }

  const nonce = body.message.match(/Nonce:\s*([a-f0-9]+)/i)?.[1];
  if (!nonce) {
    return NextResponse.json({ error: "Missing nonce" }, { status: 400 });
  }
  const stored = await AuthNonce.findOneAndDelete({ value: nonce, expiresAt: { $gt: new Date() } });
  if (!stored) {
    return NextResponse.json({ error: "Nonce expired. Try connecting again." }, { status: 400 });
  }

  const valid = await verifyMessage({
    address: address as `0x${string}`,
    message: body.message,
    signature: body.signature,
  });
  if (!valid) {
    return NextResponse.json({ error: "Signature rejected" }, { status: 401 });
  }

  const existing = await readSession();
  let user = await User.findOne({ address });

  if (existing && !user) {
    const current = await User.findById(existing.id);
    if (current && !current.address) {
      current.address = address;
      await current.save();
      user = current;
    }
  }

  if (!user) {
    const referrer = await findReferrer();
    user = await User.create({
      address,
      name: `${address.slice(0, 6)}…${address.slice(-4)}`,
      role: "user",
      referralCode: makeReferralCode(),
      referredBy: referrer?._id,
    });
  }

  if (user.banned) {
    return NextResponse.json({ error: "Account is suspended" }, { status: 403 });
  }

  const session = toSessionUser(user);
  await setSessionCookie(session);
  return NextResponse.json({ user: session });
}
