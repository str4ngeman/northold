"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/universe", label: "Sheet" },
  { href: "/universe/claims", label: "Register" },
];

export function FieldShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh flex-col bg-[#0b0b0c] text-bone">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--rule)] px-4 py-3 lg:px-6">
        <div className="flex items-center gap-5">
          <Logo />
          <span className="hidden h-4 w-px bg-[var(--rule)] sm:block" />
          <span className="tag hidden sm:inline">Field Survey</span>
        </div>
        <nav className="flex items-center">
          {LINKS.map((item) => {
            const on = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "num border-l border-[var(--rule)] px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors first:border-l-0",
                  on ? "text-flux" : "text-bone-3 hover:text-bone",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/app"
            className="num ml-3 border border-[var(--rule)] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-bone-2 transition-colors hover:border-bone-3 hover:text-bone"
          >
            The Vault
          </Link>
        </nav>
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}
