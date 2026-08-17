"use client";

import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHasHydrated } from "@/hooks/use-now";
import { formatAddress } from "@/lib/format";
import { useVaultStore } from "@/store/vault-store";

export function WalletButton() {
  const hydrated = useHasHydrated();
  const address = useVaultStore((s) => s.address);
  const connect = useVaultStore((s) => s.connect);
  const disconnect = useVaultStore((s) => s.disconnect);

  if (!hydrated) {
    return (
      <Button variant="outline" disabled>
        <Wallet data-icon="inline-start" />
        Connect wallet
      </Button>
    );
  }

  if (!address) {
    return (
      <Button onClick={connect}>
        <Wallet data-icon="inline-start" />
        Connect wallet
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={disconnect} title="Disconnect mock wallet">
      <span className="size-1.5 rounded-full bg-emerald-400" />
      {formatAddress(address)}
    </Button>
  );
}
