"use client";

import { Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";

import { CtaButton } from "@/components/ui/cta-button";
import { useCatalog } from "@/hooks/use-catalog";
import { useSession } from "@/hooks/use-session";
import { formatAddress } from "@/lib/format";
import { appNetworkId, NETWORKS, networkIdFromChainId, walletAddChainParams, type NetworkId } from "@/lib/networks";

export function WalletButton() {
  const catalog = useCatalog();
  const { user } = useSession();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync, isPending } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin" || !address || !isConnected) return;
    void fetch("/api/admin/network", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deployerAddress: address }),
    });
  }, [user?.role, address, isConnected]);

  const targetChainId = catalog?.network.chainId ?? catalog?.protocol?.chainId;
  const targetNetwork = (catalog?.network.id ??
    (targetChainId ? networkIdFromChainId(targetChainId) : appNetworkId())) as NetworkId;

  async function ensureNetwork(id: NetworkId) {
    const def = NETWORKS[id];
    if (chainId === def.chainId) return;
    try {
      await switchChainAsync({ chainId: def.chainId });
    } catch {
      const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
      if (!ethereum) throw new Error("No browser wallet available");
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [walletAddChainParams(id, catalog?.network.rpcUrl)],
      });
      await switchChainAsync({ chainId: def.chainId });
    }
  }

  async function connectWallet() {
    setBusy(true);
    try {
      const connector = connectors.find((item) => item.id === "injected") ?? connectors[0];
      if (!connector) {
        toast.error("No browser wallet found.");
        return;
      }
      if (!isConnected) {
        await connectAsync({ connector });
      }
      await ensureNetwork(targetNetwork);
      toast.success(`Wallet on ${NETWORKS[targetNetwork].shortLabel}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wallet connect failed");
    } finally {
      setBusy(false);
    }
  }

  if (isConnected && address) {
    return (
      <CtaButton href="/account" variant="ghost" className="h-11 px-4">
        <Wallet className="size-4" />
        {formatAddress(address)}
      </CtaButton>
    );
  }

  return (
    <CtaButton
      variant="ghost"
      className="h-11 px-4"
      disabled={busy || isPending}
      onClick={() => void connectWallet()}
    >
      {busy || isPending ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
      {busy || isPending ? "Connecting" : "Connect wallet"}
    </CtaButton>
  );
}
