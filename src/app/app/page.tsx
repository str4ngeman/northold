"use client";

import Link from "next/link";

import { LetterButton } from "@/components/kinetic/letter-button";
import { Reveal } from "@/components/kinetic/reveal";
import { VaultCard } from "@/components/vault-card";
import { WalletButton } from "@/components/wallet-button";
import { useNow } from "@/hooks/use-now";
import { usePositions } from "@/hooks/use-positions";
import { useSession } from "@/hooks/use-session";

export default function VaultPage() {
  const now = useNow();
  const { user, loading } = useSession();
  const { views } = usePositions(now);

  if (loading) return <main className="page" />;

  return (
    <main className="page">
      <div className="container">
        <div className="split">
          <div>
            <p className="label">Vault</p>
            <Reveal as="h1" className="h2 hero-copy">
              A book of plates
            </Reveal>
            <p className="body hero-body">
              Each card is a position NFT. Claim USDT, wait the lock, or break the seal.
            </p>
          </div>
          <div>
            <LetterButton href="/app/stake" label="Mint a card" />
          </div>
        </div>

        {!user ? (
          <div className="glass" style={{ marginTop: "var(--s-7)", padding: "3rem var(--gutter)" }}>
            <p className="h3">Sign in to open the vault</p>
            <p className="body" style={{ marginTop: "0.8rem" }}>
              Connect a wallet or log in with email.
            </p>
            <div style={{ marginTop: "var(--s-4)", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <WalletButton />
              <LetterButton href="/login" label="Email login" variant="ghost" />
            </div>
          </div>
        ) : views.length === 0 ? (
          <div className="glass" style={{ marginTop: "var(--s-7)", padding: "3rem var(--gutter)" }}>
            <p className="h3">No cards yet</p>
            <div style={{ marginTop: "var(--s-4)" }}>
              <LetterButton href="/app/stake" label="Mint a card" />
            </div>
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "var(--s-7) 0 0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "2.5rem",
              justifyItems: "center",
            }}
          >
            {views.map((view) => (
              <li key={view.tokenId}>
                <Link href={`/app/position/${view.tokenId}`}>
                  <VaultCard view={view} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
