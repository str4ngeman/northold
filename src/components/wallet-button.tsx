"use client";

import { Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useChainId, useConnect, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";

import { CtaButton } from "@/components/ui/cta-button";
import { useCatalog } from "@/hooks/use-catalog";
import { useSession } from "@/hooks/use-session";
import { formatAddress } from "@/lib/format";
import { appNetworkId, NETWORKS, networkIdFromChainId, walletAddChainParams, type NetworkId } from "@/lib/networks";

export function WalletButton() {
  const router = useRouter();
  const pathname = usePathname();
  const catalog = useCatalog();
  const { user, loading, refresh } = useSession();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
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
      if (!ethereum) throw new Error("MetaMask is not available");
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
        toast.error("No browser wallet found. Install MetaMask.");
        return;
      }
      let wallet = address;
      if (!isConnected || !wallet) {
        const result = await connectAsync({ connector });
        wallet = result.accounts[0];
      }
      if (!wallet) throw new Error("Wallet did not return an address");
      await ensureNetwork(targetNetwork);
      const nonceRes = await fetch("/api/auth/nonce");
      const nonceData = (await nonceRes.json()) as { message?: string; error?: string };
      if (!nonceRes.ok || !nonceData.message) throw new Error(nonceData.error || "Could not start wallet sign-in");
      const signature = await signMessageAsync({ message: nonceData.message, account: wallet });
      const authRes = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet, signature, message: nonceData.message }),
      });
      const data = await authRes.json();
      if (!authRes.ok) throw new Error(data.error || "Wallet sign-in failed");
      const signedIn = await refresh();
      toast.success(`Wallet connected on ${NETWORKS[targetNetwork].shortLabel}`);
      if (signedIn?.role === "admin" && wallet) {
        await fetch("/api/admin/network", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deployerAddress: wallet }),
        });
      }
      if (!user && (pathname === "/login" || pathname === "/register")) {
        router.push(signedIn?.role === "admin" ? "/admin" : "/app");
        router.refresh();
      }
    } catch (error) {
      disconnect();
      toast.error(error instanceof Error ? error.message : "Wallet connect failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <CtaButton variant="ghost" disabled className="h-11 px-4">
        <Loader2 className="size-4 animate-spin" />
      </CtaButton>
    );
  }

  if (user?.address && isConnected) {
    return (
      <CtaButton href="/account" variant="ghost" className="h-11 px-4">
        <Wallet className="size-4" />
        {formatAddress(address ?? user.address)}
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
      <Wallet className="size-4" />
      {busy || isPending ? "Connecting" : user?.address ? "Reconnect MetaMask" : "Connect MetaMask"}
    </CtaButton>
  );
}
