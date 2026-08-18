"use client";

import { useCallback, useEffect, useState } from "react";

export type LabState = {
  network?: {
    id: "sepolia" | "mainnet";
    name: string;
    shortLabel: string;
    mode: "lab" | "test" | "live";
    chainId: number;
    explorerUrl: string;
    capabilities: { warp: boolean; faucet: boolean; deployMocks: boolean };
  };
  rpc: string;
  connected: boolean;
  chainId?: number;
  block?: string;
  time?: { unix: number; iso: string };
  deployment: {
    chainId: number;
    deployer: string;
    timestamp: number;
    contracts: Record<string, string>;
    plans: { id: number; slug: string }[];
  } | null;
};

export function useLabState(pollMs = 4000) {
  const [state, setState] = useState<LabState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/lab/state");
      const data = (await res.json()) as LabState & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load chain");
        return;
      }
      setError(null);
      setState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chain");
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!pollMs) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  return { state, error, refresh };
}
