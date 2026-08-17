"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDisconnect } from "wagmi";

import { LetterButton } from "@/components/kinetic/letter-button";
import { WalletButton } from "@/components/wallet-button";
import { useSession } from "@/hooks/use-session";
import { formatAddress } from "@/lib/format";

type RefData = {
  code: string;
  count: number;
  referred: { id: string; email: string | null; address: string | null }[];
};

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const { disconnect } = useDisconnect();
  const [refs, setRefs] = useState<RefData | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!user) return;
    void fetch("/api/account/referrals")
      .then((r) => r.json())
      .then(setRefs);
  }, [user]);

  if (loading) return <main className="page" />;
  if (!user) {
    return (
      <main className="page">
        <div className="container">
          <h1 className="h2">Sign in first</h1>
          <div style={{ marginTop: "var(--s-4)" }}>
            <LetterButton href="/login" label="Sign in" />
          </div>
        </div>
      </main>
    );
  }

  const link = `${origin}/register?ref=${user.referralCode}`;

  async function signOut() {
    disconnect();
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <p className="label">Account</p>
        <h1 className="h2 hero-copy">{user.name || user.email || "Member"}</h1>
        <div className="glass" style={{ marginTop: "var(--s-5)", padding: "1.6rem" }}>
          <div className="stat">
            <dt>Email</dt>
            <dd>{user.email || "—"}</dd>
          </div>
          <div className="stat">
            <dt>Wallet</dt>
            <dd>{user.address ? formatAddress(user.address) : "Not linked"}</dd>
          </div>
          <div className="stat">
            <dt>Role</dt>
            <dd>{user.role}</dd>
          </div>
          <div style={{ marginTop: "1.2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {!user.address && <WalletButton />}
            <LetterButton label="Sign out" variant="ghost" onClick={() => void signOut()} />
          </div>
        </div>

        <p className="label" style={{ marginTop: "var(--s-6)" }}>
          Referral
        </p>
        <div className="glass" style={{ marginTop: "1rem", padding: "1.6rem" }}>
          <p className="body">Share this link. New sign-ups attach to your code.</p>
          <p style={{ marginTop: "0.8rem", color: "var(--light)", wordBreak: "break-all" }}>{link}</p>
          <p className="body" style={{ marginTop: "0.8rem" }}>
            {refs?.count ?? 0} referred
          </p>
          <LetterButton
            label="Copy link"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(link);
              toast.success("Referral link copied");
            }}
          />
        </div>
      </div>
    </main>
  );
}
