"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FadeIn } from "@/components/motion";
import { SEAMS } from "@/lib/seams";

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
      toast.success("Register opened. Pick a seam.");
      router.push("/app/stake");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Register failed");
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
        <h1 className="display mt-5 text-3xl">Open a register.</h1>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-bone-2">
          Email and password to start. A wallet is only needed when you sink your first shaft.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-5">
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
          <button type="submit" className="act act-solid w-full" disabled={busy}>
            <span>{busy ? "Opening…" : "Create account"}</span>
          </button>
        </form>

        <p className="mt-6 text-[0.85rem] text-bone-2">
          Already registered?{" "}
          <Link href="/login" className="text-flux underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </FadeIn>

      <FadeIn delay={0.1} className="hidden bg-[#0b0b0c] p-8 sm:block">
        <p className="tag">Open seams</p>
        <ul className="mt-5 space-y-5">
          {SEAMS.map((seam) => (
            <li key={seam.slug}>
              <span className="num flex items-center gap-2 text-[10px] tracking-[0.14em]" style={{ color: seam.color }}>
                <span className="size-1.5" style={{ background: seam.color }} />
                {seam.index} · {seam.name.toUpperCase()}
              </span>
              <p className="num mt-1.5 text-[10px] text-bone-3">{seam.depth}</p>
              <p className="mt-2 text-[0.78rem] leading-relaxed text-bone-2">{seam.matrix}</p>
            </li>
          ))}
        </ul>
      </FadeIn>
    </main>
  );
}
