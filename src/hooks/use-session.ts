"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { SessionUser } from "@/lib/auth";

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<SessionUser | null>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const inflight = useRef<Promise<SessionUser | null> | null>(null);

  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { user: SessionUser | null };
        setUser(data.user);
        return data.user;
      } catch {
        setUser(null);
        return null;
      } finally {
        setLoading(false);
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout],
  );

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
