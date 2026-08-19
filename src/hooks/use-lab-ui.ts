"use client";

import { useEffect, useState } from "react";

import { useCatalog } from "@/hooks/use-catalog";
import { labUiFromEnvAndHost } from "@/lib/lab-surface";

export function useLabUi(): boolean {
  const catalog = useCatalog();
  const [fromHost, setFromHost] = useState(false);

  useEffect(() => {
    setFromHost(labUiFromEnvAndHost(window.location.host));
  }, []);

  if (typeof catalog?.labUi === "boolean") return catalog.labUi;
  return fromHost;
}
