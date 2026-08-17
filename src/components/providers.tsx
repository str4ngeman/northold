"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { NEXT_TOKEN_ID, materializeSeeds } from "@/lib/dummy";
import { useVaultStore } from "@/store/vault-store";

function seedVaultIfEmpty() {
  const { positions } = useVaultStore.getState();
  if (positions.length > 0) return;
  useVaultStore.setState({
    positions: materializeSeeds(Date.now()),
    nextTokenId: NEXT_TOKEN_ID,
  });
}

function VaultBootstrap() {
  useEffect(() => {
    const persist = useVaultStore.persist;
    if (persist.hasHydrated()) seedVaultIfEmpty();
    return persist.onFinishHydration(seedVaultIfEmpty);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <VaultBootstrap />
      {children}
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
