import { NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";

function watchtowerConfig() {
  const url = process.env.WATCHTOWER_URL?.replace(/\/$/, "");
  const token = process.env.WATCHTOWER_TOKEN;
  return { url, token, configured: Boolean(url && token) };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { configured } = watchtowerConfig();
  return json({
    configured,
    pollSeconds: 300,
    image: "ghcr.io/str4ngeman/northold:latest",
  });
}

export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { url, token, configured } = watchtowerConfig();
  if (!configured || !url || !token) {
    return NextResponse.json(
      { error: "Watchtower is not configured on this host. Add it to docker-compose and set WATCHTOWER_TOKEN." },
      { status: 501 },
    );
  }

  try {
    const res = await fetch(`${url}/v1/update`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        { error: body || `Watchtower returned ${res.status}` },
        { status: 502 },
      );
    }
    return json({
      ok: true,
      message: "Pull started. The site will restart itself when the new image is ready.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not reach Watchtower. Is the watchtower container running on the same Docker network?",
      },
      { status: 502 },
    );
  }
}
