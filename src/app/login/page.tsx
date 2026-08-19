"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CtaButton } from "@/components/ui/cta-button";
import { FadeIn } from "@/components/motion";
import { Surface } from "@/components/ui/surface";
import { useSession } from "@/hooks/use-session";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession();
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
      await refresh();
      toast.success("Welcome back");
      router.push(data.user?.role === "admin" ? "/admin" : "/app");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <FadeIn>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">Account</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in and hold north</h1>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          Email and password only. Connect MetaMask later when you mint or when the deployer signs a vault change.
        </p>
        <Surface className="mt-6 p-6">
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <CtaButton type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </CtaButton>
          </form>
        </Surface>
        <p className="mt-4 text-sm text-[var(--ink-2)]">
          No account?{" "}
          <Link href="/register" className="text-[var(--light)]">
            Create one
          </Link>
        </p>
      </FadeIn>
    </main>
  );
}
