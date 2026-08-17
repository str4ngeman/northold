"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDisconnect } from "wagmi";
import { Copy, Gift } from "lucide-react";

import { CtaButton } from "@/components/ui/cta-button";
import { FadeIn } from "@/components/motion";
import { Surface } from "@/components/ui/surface";
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

  if (loading) return <div className="h-40 animate-pulse rounded-[1.75rem] bg-white/5" />;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold">Sign in first</h1>
        <div className="mt-5">
          <CtaButton href="/login">Sign in</CtaButton>
        </div>
      </div>
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
    <div className="mx-auto max-w-2xl">
      <FadeIn>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">Account</p>
        <h1 className="mt-2 text-3xl font-semibold">{user.name || user.email || "Member"}</h1>
      </FadeIn>
      <Surface className="mt-6 space-y-4 p-6">
        <Row label="Email" value={user.email || "—"} />
        <Row label="Wallet" value={user.address ? formatAddress(user.address) : "Not linked"} />
        <Row label="Role" value={user.role} />
        <div className="flex flex-wrap gap-3 pt-2">
          {!user.address && <WalletButton />}
          <CtaButton variant="ghost" onClick={() => void signOut()}>
            Sign out
          </CtaButton>
        </div>
      </Surface>

      <Surface className="mt-6 p-6">
        <div className="flex items-center gap-2">
          <Gift className="size-5 text-[var(--light)]" />
          <h2 className="text-lg font-semibold">Invite friends</h2>
        </div>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          Invite people north. New sign-ups attach to your code. {refs?.count ?? 0} have joined so far.
        </p>
        <p className="mt-3 break-all rounded-2xl bg-black/20 px-4 py-3 text-sm text-[var(--light)]">{link}</p>
        <div className="mt-4">
          <CtaButton
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(link);
              toast.success("Referral link copied");
            }}
          >
            <Copy className="size-4" /> Copy link
          </CtaButton>
        </div>
      </Surface>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-3 last:border-0">
      <span className="text-sm text-[var(--ink-3)]">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
