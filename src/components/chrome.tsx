"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Lock,
  Navigation,
  UserRound,
  Shield,
  FlaskConical,
  ArrowUpRight,
} from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ChatWidget } from "@/components/chat-widget";
import { NetworkBadge } from "@/components/network-badge";
import { WalletButton } from "@/components/wallet-button";
import { useSession } from "@/hooks/use-session";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

const APP_NAV = [
  { href: "/app", label: "Hold", icon: Compass },
  { href: "/app/stake", label: "Lock", icon: Lock },
  { href: "/plans", label: "Bearings", icon: Navigation },
  { href: "/account", label: "Account", icon: UserRound },
];

export function RootChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/lab")) return <>{children}</>;
  if (
    pathname.startsWith("/app") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/plans")
  ) {
    return <AppShell>{children}</AppShell>;
  }
  return <MarketingShell>{children}</MarketingShell>;
}

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col gap-1 border-r border-white/6 bg-black/20 p-5 lg:flex">
        <Logo className="mb-8" />
        {APP_NAV.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}
        {user?.role === "admin" && (
          <>
            <NavLink href="/admin" label="Admin" icon={Shield} active={pathname.startsWith("/admin")} />
            <NavLink href="/lab" label="Lab" icon={FlaskConical} active={pathname.startsWith("/lab")} />
          </>
        )}
        <p className="mt-auto px-3 pt-8 text-[11px] leading-relaxed text-[var(--ink-3)]">
          Yield is paid in the token you locked. Principal comes back in that same token.
        </p>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-4 lg:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <p className="text-sm text-[var(--ink-2)]">
              {user ? `Welcome back${user.name ? `, ${user.name}` : ""}` : BRAND.tagline}
            </p>
            <NetworkBadge />
          </div>
          <WalletButton />
        </header>
        <main className="flex-1 px-4 pb-28 lg:px-8 lg:pb-12">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/6 bg-[#07090f]/90 px-2 py-2 backdrop-blur-xl lg:hidden">
          {APP_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px]",
                pathname === item.href ? "text-[var(--light)]" : "text-[var(--ink-3)]",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <ChatWidget />
      </div>
    </div>
  );
}

function MarketingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-4 backdrop-blur-xl lg:px-10">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-[var(--ink-2)] md:flex">
          <Link href="/plans" className={pathname === "/plans" ? "text-[var(--ink)]" : "hover:text-[var(--ink)]"}>
            Bearings
          </Link>
          <Link href="/app" className="hover:text-[var(--ink)]">
            Hold
          </Link>
          <Link href={user ? "/account" : "/login"} className="hover:text-[var(--ink)]">
            {user ? "Account" : "Sign in"}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <WalletButton />
          <Link
            href="/app/stake"
            className="hidden h-11 items-center gap-1 rounded-full bg-[var(--light)] px-4 text-sm font-semibold text-[#16120a] sm:inline-flex"
          >
            Open a hold <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </header>
      {children}
      <footer className="px-4 py-10 text-center text-xs text-[var(--ink-3)] lg:px-10">
        <FooterEgg />
      </footer>
      <ChatWidget />
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Compass;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
        active ? "bg-white/8 text-[var(--ink)]" : "text-[var(--ink-2)] hover:bg-white/5 hover:text-[var(--ink)]",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function FooterEgg() {
  return (
    <button
      type="button"
      className="text-[var(--ink-3)] transition-colors hover:text-[var(--light)]"
      onClick={(event) => {
        const node = event.currentTarget;
        const n = Number(node.dataset.n ?? "0") + 1;
        node.dataset.n = String(n);
        if (n === 3) node.textContent = "True north is a date. The key still opens nothing.";
      }}
    >
      {BRAND.name} · {BRAND.domain} · {BRAND.tagline}
    </button>
  );
}
