"use client";

import { useCallback, useEffect, useState } from "react";

import type { Catalog } from "@/lib/load-catalog";

export function useCatalog() {
  const { catalog } = useCatalogRefresh();
  return catalog;
}

export function useCatalogRefresh() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/catalog", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as Catalog;
    setCatalog(data);
    return data;
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  return { catalog, refresh };
}
