import Link from "next/link";

import { WalletButton } from "@/components/wallet-button";

const NAV = [
  { href: "/app", label: "My Vault" },
  { href: "/app/stake", label: "Mint a card" },
  { href: "/plans", label: "Plans" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07070c]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md border border-primary/40 bg-primary/10 font-display text-sm text-primary">
            L
          </span>
          <span className="font-display text-lg tracking-wide">Leagueto</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <WalletButton />
      </div>
      <nav className="flex items-center gap-4 border-t border-white/6 px-4 py-2 text-sm text-muted-foreground sm:hidden">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-foreground">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
