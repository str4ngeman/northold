import { NextResponse } from "next/server";

import { loadCatalog } from "@/lib/load-catalog";

export async function GET() {
  return NextResponse.json(await loadCatalog(), {
    headers: { "Cache-Control": "no-store" },
  });
}
