import { NextResponse, type NextRequest } from "next/server";

import { labUiFromEnvAndHost } from "@/lib/lab-surface";

export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (labUiFromEnvAndHost(host)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/lab", "/lab/:path*", "/api/lab/:path*"],
};
