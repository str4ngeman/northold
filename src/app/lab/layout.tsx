"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Activity,
  ArrowLeft,
  Cpu,
  FlaskConical,
  Radar,
  Rocket,
  ShieldCheck,
  Timer,
  Wallet,
  Banknote,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { NetworkBadge } from "@/components/network-badge";
import { StatusDot } from "@/components/lab/ui";
import { WalletButton } from "@/components/wallet-button";
import { useLabState } from "@/hooks/use-lab-state";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Admin", icon: ArrowLeft },
  { href: "/lab", label: "Chain", icon: Cpu },
  { href: "/lab/deploy", label: "Deploy", icon: Rocket },
  { href: "/lab/test", label: "Test", icon: FlaskConical },
  { href: "/lab/audit", label: "Audit", icon: ShieldCheck },
  { href: "/lab/sim", label: "Simulate", icon: Timer },
  { href: "/lab/monitor", label: "Monitor", icon: Radar },
  { href: "/lab/wallet", label: "Wallet", icon: Wallet },
  { href: "/lab/fund", label: "Fund", icon: Banknote },
];

export default function LabLayout({ children }: LayoutProps<"/lab">) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();
  const { state } = useLabState(6000);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "admin") router.replace("/app");
  }, [user, loading, router]);

  if (loading || user?.role !== "admin") {
    return <main className="grid min-h-dvh place-items-center text-sm text-[var(--ink-3)]">Checking admin access…</main>;
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-1 border-r border-white/6 bg-black/20 p-5">
        <Logo className="mb-6" />
        <div className="mb-3 px-3">
          <NetworkBadge />
        </div>
        <div className="mb-3 px-3">
          <WalletButton />
        </div>
        <p className="mb-3 px-3 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-3)]">Northold lab</p>
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm",
              pathname === item.href ? "bg-white/8 text-white" : "text-[var(--ink-2)] hover:bg-white/5",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
        <div className="mt-auto space-y-3 px-3 pt-8">
          <StatusDot on={Boolean(state?.connected)} />
          <p className="text-[11px] leading-relaxed text-[var(--ink-3)]">
            {state?.network?.name ?? "Sepolia"} — deploy writes contract addresses into this catalog.
          </p>
        </div>
      </aside>
      <div className="p-6 lg:p-10">
        <div className="mb-6 flex items-center justify-between gap-3 text-xs text-[var(--ink-3)] lg:hidden">
          <span className="inline-flex items-center gap-2">
            <Activity className="size-3.5" />
            Northold lab
          </span>
          <Link href="/admin" className="text-[var(--ink)]">
            Admin
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
