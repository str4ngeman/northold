"use client";

import { useEffect, useState } from "react";

import type { Catalog } from "@/lib/load-catalog";

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    void fetch("/api/catalog")
      .then((res) => res.json())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  return catalog;
}
