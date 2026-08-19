import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Wallet sign-in is disabled. Use email and password." },
    { status: 410 },
  );
}
