"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LetterButton } from "@/components/kinetic/letter-button";
import { WalletButton } from "@/components/wallet-button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Signed in");
      router.push(data.user?.role === "admin" ? "/admin" : "/app");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 480 }}>
        <p className="label">Account</p>
        <h1 className="h2 hero-copy">Sign in</h1>
        <p className="body hero-body">Wallet or email. Same vault either way.</p>
        <div style={{ marginTop: "var(--s-4)" }}>
          <WalletButton />
        </div>
        <form className="glass" style={{ marginTop: "var(--s-5)", padding: "1.6rem" }} onSubmit={(e) => void onSubmit(e)}>
          <label className="field">
            <span className="label">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field" style={{ marginTop: "1.2rem" }}>
            <span className="label">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <div style={{ marginTop: "1.6rem" }}>
            <LetterButton label={busy ? "Signing in" : "Sign in"} type="submit" disabled={busy} />
          </div>
        </form>
        <p className="body" style={{ marginTop: "1rem" }}>
          No account? <a href="/register" style={{ color: "var(--light)" }}>Create one</a>
        </p>
      </div>
    </main>
  );
}
