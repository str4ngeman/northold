"use client";

import { useCallback, useEffect, useState } from "react";

import type { SessionUser } from "@/lib/auth";

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = (await res.json()) as { user: SessionUser | null };
    setUser(data.user);
    setLoading(false);
    return data.user;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  return { user, loading, refresh, logout };
}
