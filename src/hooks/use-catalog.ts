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

import type { Catalog } from "@/lib/load-catalog";

type CatalogContextValue = {
  catalog: Catalog | null;
  loading: boolean;
  refresh: () => Promise<Catalog | null>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const inflight = useRef<Promise<Catalog | null> | null>(null);
  const latest = useRef<Catalog | null>(null);

  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      try {
        const res = await fetch("/api/catalog");
        if (!res.ok) return latest.current;
        const data = (await res.json()) as Catalog;
        latest.current = data;
        setCatalog(data);
        return data;
      } catch {
        return latest.current;
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

  const value = useMemo(() => ({ catalog, loading, refresh }), [catalog, loading, refresh]);

  return createElement(CatalogContext.Provider, { value }, children);
}

function useCatalogContext() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}

export function useCatalog() {
  return useCatalogContext().catalog;
}

export function useCatalogRefresh() {
  return useCatalogContext();
}
