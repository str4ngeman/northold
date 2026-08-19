"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DepthRule } from "@/components/kit";
import { FadeIn } from "@/components/motion";
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
    <main className="mx-auto grid max-w-4xl gap-px bg-[var(--rule)] px-0 py-20 sm:grid-cols-[1fr_260px] sm:px-4">
      <FadeIn className="bg-[#0b0b0c] p-8 lg:p-10">
        <div className="flex items-center gap-4">
          <span className="tag whitespace-nowrap">Account</span>
          <span className="h-px flex-1 bg-[var(--rule)]" />
        </div>
        <h1 className="display mt-5 text-3xl">Back to the register.</h1>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-bone-2">
          Email and password. Connect a wallet later, when you sink or lift.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-5">
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" className="act act-solid w-full" disabled={busy}>
            <span>{busy ? "Signing in…" : "Sign in"}</span>
          </button>
        </form>

        <p className="mt-6 text-[0.85rem] text-bone-2">
          No account?{" "}
          <Link href="/register" className="text-flux underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </FadeIn>

      <FadeIn delay={0.1} className="hidden bg-[#0b0b0c] p-8 sm:block">
        <p className="tag mb-6">Depth</p>
        <DepthRule height={300} />
      </FadeIn>
    </main>
  );
}
