import crypto from "crypto";
import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { AuthNonce } from "@/lib/models/nonce";

export async function GET() {
  await connectDb();
  const nonce = crypto.randomBytes(16).toString("hex");
  await AuthNonce.create({
    value: nonce,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  const domain = process.env.NEXT_PUBLIC_APP_NAME || "Leagueto";
  const message = `${domain} wants you to sign in.\n\nNonce: ${nonce}`;
  return NextResponse.json({ nonce, message });
}
