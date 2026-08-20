import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";

function watchtowerConfig() {
  const url = process.env.WATCHTOWER_URL?.replace(/\/$/, "");
  const token = process.env.WATCHTOWER_TOKEN;
  return { url, token, configured: Boolean(url && token) };
}

function formatReachError(err: unknown): string {
  const parts: string[] = [];
  const walk = (value: unknown) => {
    if (!(value instanceof Error)) return;
    if (value.message && !parts.includes(value.message)) parts.push(value.message);
    const code = (value as NodeJS.ErrnoException).code;
    if (code && !parts.includes(code)) parts.push(code);
    const cause = (value as Error & { cause?: unknown }).cause;
    if (cause) walk(cause);
    if ("errors" in value && Array.isArray((value as AggregateError).errors)) {
      for (const nested of (value as AggregateError).errors) walk(nested);
    }
  };
  walk(err);

  const detail = parts.filter((p) => p !== "fetch failed").join(" · ") || "fetch failed";
  return `Could not reach Watchtower (${detail}). Is the watchtower container running on the same Docker network as this app?`;
}

/** Resolve Docker DNS to IPv4 — Node 22/undici often fails on AAAA-first lookups. */
async function watchtowerUpdateUrl(base: string): Promise<string> {
  const target = new URL(`${base}/v1/update`);
  try {
    const { address } = await lookup(target.hostname, { family: 4 });
    target.hostname = address;
  } catch {
    // Keep the hostname; fetch will surface the DNS error.
  }
  return target.toString();
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
    // nickfedor/watchtower requires POST; async so we return before this container is recreated.
    const updateUrl = `${await watchtowerUpdateUrl(url)}?async=true`;
    const res = await fetch(updateUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok && res.status !== 202) {
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
    return NextResponse.json({ error: formatReachError(err) }, { status: 502 });
  }
}
