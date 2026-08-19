"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Layers3,
  Coins,
  Users,
  WalletCards,
  Gift,
  MessageCircle,
  Settings,
  FlaskConical,
  ArrowLeft,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { NetworkBadge } from "@/components/network-badge";
import { WalletButton } from "@/components/wallet-button";
import { useSession } from "@/hooks/use-session";
import { useLabUi } from "@/hooks/use-lab-ui";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/plans", label: "Bearings", icon: Layers3 },
  { href: "/admin/tokens", label: "Tokens", icon: Coins },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/positions", label: "Positions", icon: WalletCards },
  { href: "/admin/referrals", label: "Referrals", icon: Gift },
  { href: "/admin/support", label: "Support", icon: MessageCircle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/lab", label: "Lab", icon: FlaskConical },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, loading } = useSession();
  const labUi = useLabUi();
  const router = useRouter();
  const pathname = usePathname();

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
        <div className="mb-4 px-3">
          <NetworkBadge />
        </div>
        <div className="mb-4 px-3">
          <WalletButton />
        </div>
        {LINKS.filter((item) => item.href !== "/lab" || labUi).map((item) => (
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
        <Link href="/app" className="mt-auto inline-flex items-center gap-2 px-3 py-2 text-sm text-[var(--ink-3)]">
          <ArrowLeft className="size-4" /> Back to app
        </Link>
      </aside>
      <div className="p-6 lg:p-10">{children}</div>
    </div>
  );
}
