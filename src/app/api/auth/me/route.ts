import { NextResponse } from "next/server";

import { readSession } from "@/lib/auth";
import { connectDb } from "@/lib/db";

export async function GET() {
  await connectDb();
  const session = await readSession();
  return NextResponse.json({ user: session });
}
