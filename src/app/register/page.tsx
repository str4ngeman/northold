"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LetterButton } from "@/components/kinetic/letter-button";

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
      toast.success("Account created");
      router.push("/app");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 480 }}>
        <p className="label">Account</p>
        <h1 className="h2 hero-copy">Create an account</h1>
        <form className="glass" style={{ marginTop: "var(--s-5)", padding: "1.6rem" }} onSubmit={(e) => void onSubmit(e)}>
          <label className="field">
            <span className="label">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field" style={{ marginTop: "1.2rem" }}>
            <span className="label">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field" style={{ marginTop: "1.2rem" }}>
            <span className="label">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </label>
          <div style={{ marginTop: "1.6rem" }}>
            <LetterButton label={busy ? "Creating" : "Create account"} type="submit" disabled={busy} />
          </div>
        </form>
      </div>
    </main>
  );
}
