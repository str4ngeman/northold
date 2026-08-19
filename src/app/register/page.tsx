"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CtaButton } from "@/components/ui/cta-button";
import { FadeIn } from "@/components/motion";
import { Surface } from "@/components/ui/surface";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          ref: new URLSearchParams(window.location.search).get("ref"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Hold unlocked. Time to set a bearing.");
      router.push("/app/stake");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <FadeIn>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">Account</p>
        <h1 className="mt-3 text-3xl font-semibold">Create your hold</h1>
        <p className="mt-2 text-sm text-[var(--ink-2)]">Email and password. Connect MetaMask when you lock.</p>
        <Surface className="mt-6 p-6">
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <label className="field">
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </label>
            <CtaButton type="submit" disabled={busy} className="w-full">
              {busy ? "Creating…" : "Create account"}
            </CtaButton>
          </form>
        </Surface>
      </FadeIn>
    </main>
  );
}
