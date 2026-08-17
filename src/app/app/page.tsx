"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { VaultCard } from "@/components/vault-card";
import { useHasHydrated, useNow } from "@/hooks/use-now";
import { useOwnedViews } from "@/hooks/use-owned-views";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/store/vault-store";

export default function VaultPage() {
  const now = useNow();
  const hydrated = useHasHydrated();
  const address = useVaultStore((s) => s.address);
  const connect = useVaultStore((s) => s.connect);
  const views = useOwnedViews(now);

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs tracking-[0.35em] text-primary uppercase">
            My Vault
          </p>
          <h1 className="mt-2 font-display text-4xl">Your book of cards</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Each card is a position NFT. Claim USDT, wait out the lock, or break the seal.
          </p>
        </div>
        <Link href="/app/stake" className={cn(buttonVariants())}>
          Mint another
        </Link>
      </div>

      {!address ? (
        <div className="mt-16 rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <p className="font-display text-xl">Connect to open your vault</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Dummy wallet — no chain required. Seed cards appear after you connect.
          </p>
          <button
            type="button"
            onClick={connect}
            className={cn(buttonVariants(), "mt-6")}
          >
            Connect wallet
          </button>
        </div>
      ) : views.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <p className="font-display text-xl">No cards yet</p>
          <Link href="/app/stake" className={cn(buttonVariants(), "mt-6 inline-flex")}>
            Mint your first card
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {views.map((view) => (
            <li key={view.tokenId}>
              <Link href={`/app/position/${view.tokenId}`} className="block transition-transform hover:-translate-y-1">
                <VaultCard view={view} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
