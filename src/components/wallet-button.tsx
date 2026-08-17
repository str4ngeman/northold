"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";

import { LetterButton } from "@/components/kinetic/letter-button";
import { useSession } from "@/hooks/use-session";
import { formatAddress } from "@/lib/format";

export function WalletButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, refresh } = useSession();
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);

  async function connectWallet() {
    setBusy(true);
    try {
      const connector = connectors.find((item) => item.id === "injected") ?? connectors[0];
      if (!connector) {
        toast.error("No browser wallet found. Install MetaMask or Rabby.");
        return;
      }

      let wallet = address;
      if (!isConnected || !wallet) {
        const result = await connectAsync({ connector });
        wallet = result.accounts[0];
      }
      if (!wallet) throw new Error("Wallet did not return an address");

      const nonceRes = await fetch("/api/auth/nonce");
      const nonceData = (await nonceRes.json()) as { message?: string; error?: string };
      if (!nonceRes.ok || !nonceData.message) {
        throw new Error(nonceData.error || "Could not start wallet sign-in");
      }

      const signature = await signMessageAsync({ message: nonceData.message, account: wallet });
      const authRes = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet, signature, message: nonceData.message }),
      });
      const data = await authRes.json();
      if (!authRes.ok) throw new Error(data.error || "Wallet sign-in failed");

      const signedIn = await refresh();
      toast.success(user && !user.address ? "Wallet linked" : "Wallet connected");
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
    return <LetterButton label="…" variant="ghost" disabled />;
  }

  if (user?.address) {
    return <LetterButton href="/account" label={formatAddress(user.address)} variant="ghost" />;
  }

  return (
    <LetterButton
      label={busy || isPending ? "Connecting" : "Connect wallet"}
      variant="ghost"
      onClick={() => void connectWallet()}
      disabled={busy || isPending}
    />
  );
}
