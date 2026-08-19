const LAB_HOSTS = new Set(["sepolia.northold.app"]);

export function parseLabUiFlag(raw?: string | null): boolean | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (["1", "true", "on", "yes"].includes(value)) return true;
  if (["0", "false", "off", "no"].includes(value)) return false;
  return null;
}

export function hostName(host?: string | null): string {
  return (host ?? "").split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

export function hostShowsLab(host?: string | null): boolean {
  const name = hostName(host);
  if (!name) return false;
  if (LAB_HOSTS.has(name)) return true;
  return name.endsWith(".sepolia.northold.app");
}

export function isLoopbackHost(host?: string | null): boolean {
  const name = hostName(host);
  return name === "localhost" || name === "127.0.0.1" || name === "::1";
}

/** Staging tools: LAB_UI env wins, else sepolia.northold.app or localhost. */
export function resolveLabUi(opts: { host?: string | null; env?: string | null }): boolean {
  const pinned = parseLabUiFlag(opts.env);
  if (pinned !== null) return pinned;
  return hostShowsLab(opts.host) || isLoopbackHost(opts.host);
}

export function labUiFromEnvAndHost(host?: string | null): boolean {
  return resolveLabUi({ host, env: process.env.LAB_UI });
}
