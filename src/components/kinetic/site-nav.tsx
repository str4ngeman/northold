"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";

import { LetterButton } from "@/components/kinetic/letter-button";
import { WalletButton } from "@/components/wallet-button";
import { useSession } from "@/hooks/use-session";

const NAV = [
  { href: "/app", label: "Vault" },
  { href: "/app/stake", label: "Mint" },
  { href: "/plans", label: "Plans" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <>
      <header className="nav" data-welcome="header">
        <Link href="/" className="nav__brand">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M9 1 L17 9 L9 17 L1 9 Z" fill="none" stroke="var(--light)" strokeWidth="1" />
          </svg>
          Leagueto
        </Link>
        <nav className="nav__links" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav__link"
              data-active={pathname === item.href}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <Link href="/account" className="nav__link">
              Account
            </Link>
          ) : (
            <Link href="/login" className="nav__link">
              Login
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" className="nav__link">
              Admin
            </Link>
          )}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className="nav__cta">
            <LetterButton href="/app/stake" label="Mint a card" variant="ghost" />
          </span>
          <Suspense fallback={null}>
            <WalletButton />
          </Suspense>
        </div>
      </header>
      <nav className="nav__mobile" aria-label="Mobile">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
        <Link href={user ? "/account" : "/login"}>{user ? "Account" : "Login"}</Link>
      </nav>
    </>
  );
}
