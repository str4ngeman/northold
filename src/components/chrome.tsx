"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDown, Layers, Map, Pickaxe, UserRound, Shield, FlaskConical } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ChatWidget } from "@/components/chat-widget";
import { NetworkBadge } from "@/components/network-badge";
import { WalletButton } from "@/components/wallet-button";
import { useSession } from "@/hooks/use-session";
import { useLabUi } from "@/hooks/use-lab-ui";
import { BRAND } from "@/lib/brand";
import { SEAMS } from "@/lib/seams";
import { cn } from "@/lib/utils";

const APP_NAV = [
  { href: "/app", label: "Vault", icon: Layers },
  { href: "/app/stake", label: "Sink", icon: ArrowDown },
  { href: "/plans", label: "Seams", icon: Pickaxe },
  { href: "/account", label: "Account", icon: UserRound },
];

const SITE_NAV = [
  { href: "/plans", label: "Seams" },
  { href: "/universe", label: "The Field" },
  { href: "/app", label: "Vault" },
];

export function RootChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/lab") || pathname.startsWith("/universe")) {
    return <>{children}</>;
  }
  if (pathname.startsWith("/app") || pathname.startsWith("/account") || pathname.startsWith("/plans")) {
    return <AppShell>{children}</AppShell>;
  }
  return <SiteShell>{children}</SiteShell>;
}

/* ================================================================ */
/* Signed-in surface — a working rail, not a marketing sidebar       */
/* ================================================================ */

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const labUi = useLabUi();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[228px_1fr]">
      <aside className="hidden flex-col border-r border-[var(--rule)] lg:flex">
        <div className="border-b border-[var(--rule)] px-5 py-[1.15rem]">
          <Logo />
        </div>

        <nav className="flex flex-col">
          {APP_NAV.map((item) => (
            <RailLink key={item.href} {...item} active={pathname === item.href} />
          ))}
          <RailLink href="/universe" label="The Field" icon={Map} active={false} />
          {user?.role === "admin" ? (
            <>
              <RailLink href="/admin" label="Admin" icon={Shield} active={pathname.startsWith("/admin")} />
              {labUi ? <RailLink href="/lab" label="Lab" icon={FlaskConical} active={pathname.startsWith("/lab")} /> : null}
            </>
          ) : null}
        </nav>

        <div className="mt-auto border-t border-[var(--rule)] p-5">
          <p className="tag">Seams open</p>
          <ul className="mt-3 space-y-2">
            {SEAMS.map((seam) => (
              <li key={seam.slug} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="size-1.5" style={{ background: seam.color }} />
                  <span className="num text-[10px] text-bone-2">{seam.name}</span>
                </span>
                <span className="num text-[9px] text-bone-3">{seam.depth.split(" – ")[1]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[11px] leading-relaxed text-bone-3">
            Coupon and principal both settle in the asset you sank.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-3 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="lg:hidden">
              <Logo />
            </span>
            <span className="tag hidden lg:inline">
              {user ? `Signed in${user.name ? ` · ${user.name}` : ""}` : BRAND.tagline}
            </span>
            <NetworkBadge />
          </div>
          <div className="flex items-center gap-2">
            {!user ? (
              <Link href="/login" className="act act-line h-10 px-4">
                <span>Sign in</span>
              </Link>
            ) : null}
            <WalletButton />
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-8 lg:px-8 lg:pb-16">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--rule)] bg-[#0b0b0c]/95 backdrop-blur-xl lg:hidden">
          {APP_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 border-l border-[var(--rule)] py-3 first:border-l-0",
                pathname === item.href ? "text-flux" : "text-bone-3",
              )}
            >
              <item.icon className="size-4" />
              <span className="num text-[9px] uppercase tracking-[0.12em]">{item.label}</span>
            </Link>
          ))}
        </nav>
        <ChatWidget />
      </div>
    </div>
  );
}

function RailLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Layers;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 border-b border-[var(--rule)] px-5 py-3.5 transition-colors",
        active ? "bg-[var(--slate)] text-bone" : "text-bone-2 hover:bg-[var(--slate)] hover:text-bone",
      )}
    >
      {active ? <span className="absolute inset-y-0 left-0 w-[2px] bg-flux" /> : null}
      <Icon className="size-4" />
      <span className="num text-[10px] uppercase tracking-[0.16em]">{label}</span>
    </Link>
  );
}

/* ================================================================ */
/* Public surface                                                    */
/* ================================================================ */

function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-dvh">
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-colors duration-500",
          lifted ? "border-[var(--rule)] bg-[#0b0b0c]/88 backdrop-blur-xl" : "border-transparent",
        )}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3.5 lg:px-12">
          <Logo />

          <nav className="hidden items-center md:flex">
            {SITE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "num relative px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors",
                  pathname === item.href ? "text-bone" : "text-bone-3 hover:text-bone",
                )}
              >
                {item.label}
                {pathname === item.href ? <span className="absolute inset-x-4 bottom-0 h-px bg-flux" /> : null}
              </Link>
            ))}
            <Link
              href={user ? "/account" : "/login"}
              className="num px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-bone-3 transition-colors hover:text-bone"
            >
              {user ? "Account" : "Sign in"}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <WalletButton />
            <Link href="/app/stake" className="act act-solid hidden h-10 px-5 sm:inline-flex">
              <span>Sink a shaft</span>
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-[var(--rule)]">
        <div className="mx-auto max-w-[1280px] px-4 py-14 lg:px-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo />
              <p className="mt-5 max-w-xs text-[0.85rem] leading-relaxed text-bone-2">
                Fixed-term deposits booked against a seam. The coupon is struck at mint and paid in the asset you sank.
              </p>
            </div>

            <FootCol
              title="Workings"
              links={[
                { href: "/plans", label: "Seams" },
                { href: "/app/stake", label: "Sink a shaft" },
                { href: "/app", label: "Your vault" },
              ]}
            />
            <FootCol
              title="The field"
              links={[
                { href: "/universe", label: "Survey sheet" },
                { href: "/universe/claims", label: "Register" },
              ]}
            />
            <FootCol
              title="Account"
              links={[
                { href: "/login", label: "Sign in" },
                { href: "/register", label: "Create account" },
                { href: "/account", label: "Referrals" },
              ]}
            />
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-[var(--rule)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <FooterEgg />
            <div className="flex gap-px">
              {SEAMS.map((seam) => (
                <span key={seam.slug} className="h-1 w-10" style={{ background: seam.color }} />
              ))}
            </div>
          </div>
        </div>
      </footer>
      <ChatWidget />
    </div>
  );
}

function FootCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="tag">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[0.85rem] text-bone-2 transition-colors hover:text-bone">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterEgg() {
  return (
    <button
      type="button"
      className="num text-left text-[10px] uppercase tracking-[0.14em] text-bone-3 transition-colors hover:text-flux"
      onClick={(event) => {
        const node = event.currentTarget;
        const n = Number(node.dataset.n ?? "0") + 1;
        node.dataset.n = String(n);
        if (n === 3) node.textContent = "The deepest seam was always the one you stopped checking on.";
      }}
    >
      {BRAND.name} · {BRAND.domain} · {BRAND.tagline}
    </button>
  );
}
