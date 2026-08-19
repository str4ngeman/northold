"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount, useDisconnect } from "wagmi";
import { Copy } from "lucide-react";

import { Row, Wipe } from "@/components/kit";
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
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [refs, setRefs] = useState<RefData | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!user) return;
    void fetch("/api/account/referrals")
      .then((r) => r.json())
      .then(setRefs);
  }, [user]);

  if (loading) return <div className="panel h-48 animate-pulse bg-[var(--slate)]" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="tag">No session</p>
        <h1 className="display mt-4 text-3xl">Sign in first.</h1>
        <Link href="/login" className="act act-solid mt-8">
          <span>Sign in</span>
        </Link>
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
    <div className="mx-auto max-w-3xl">
      <Wipe>
        <div className="flex items-center gap-4">
          <span className="tag whitespace-nowrap">Account</span>
          <span className="h-px flex-1 bg-[var(--rule)]" />
          <span className="num text-[10px] tracking-[0.14em] text-bone-3">{user.referralCode}</span>
        </div>
        <h1 className="display mt-5 text-[clamp(2rem,4.6vw,3rem)]">{user.name || user.email || "Member"}</h1>
      </Wipe>

      <Wipe delay={0.06} className="panel ticked mt-10 bg-[#0b0b0c] p-6">
        <p className="tag">Standing</p>
        <dl className="mt-4">
          <Row label="Email" value={user.email || "—"} />
          <Row label="Wallet" value={address ? formatAddress(address) : "Not connected"} />
          <Row label="Role" value={user.role} />
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          {!address ? <WalletButton /> : null}
          <button type="button" className="act act-line" onClick={() => void signOut()}>
            <span>Sign out</span>
          </button>
        </div>
      </Wipe>

      <Wipe delay={0.12} className="panel ticked mt-6 bg-[#0b0b0c] p-6">
        <p className="tag">Bring a crew</p>
        <h2 className="display mt-3 text-2xl">
          {refs?.count ?? 0} {refs?.count === 1 ? "person" : "people"} joined on your code.
        </h2>
        <p className="mt-3 max-w-md text-[0.86rem] leading-relaxed text-bone-2">
          Anyone who registers through this link is attached to your code permanently.
        </p>
        <p className="num mt-5 break-all border border-[var(--rule)] bg-[var(--pitch)] px-4 py-3 text-[0.8rem] text-flux">
          {link}
        </p>
        <button
          type="button"
          className="act act-line mt-4"
          onClick={() => {
            void navigator.clipboard.writeText(link);
            toast.success("Link copied");
          }}
        >
          <Copy className="size-3.5" />
          <span>Copy link</span>
        </button>
      </Wipe>
    </div>
  );
}
