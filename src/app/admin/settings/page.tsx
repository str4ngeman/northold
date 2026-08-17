"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LetterButton } from "@/components/kinetic/letter-button";

export default function AdminSettings() {
  const [form, setForm] = useState({
    siteName: "",
    tagline: "",
    rewardSymbol: "USDT",
    referralBps: 500,
    supportEnabled: true,
  });

  useEffect(() => {
    void fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setForm({
          siteName: d.settings.siteName ?? "",
          tagline: d.settings.tagline ?? "",
          rewardSymbol: d.settings.rewardSymbol ?? "USDT",
          referralBps: d.settings.referralBps ?? 500,
          supportEnabled: d.settings.supportEnabled !== false,
        });
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    toast[res.ok ? "success" : "error"](res.ok ? "Settings saved" : "Save failed");
  }

  return (
    <div>
      <p className="label">Settings</p>
      <h1 className="h2 hero-copy">Site configuration</h1>
      <form className="glass admin-form" onSubmit={(e) => void save(e)}>
        <label className="field"><span className="label">Site name</span>
          <input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
        </label>
        <label className="field" style={{ marginTop: "1rem" }}><span className="label">Tagline</span>
          <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </label>
        <label className="field" style={{ marginTop: "1rem" }}><span className="label">Reward symbol</span>
          <input value={form.rewardSymbol} onChange={(e) => setForm({ ...form, rewardSymbol: e.target.value })} />
        </label>
        <label className="field" style={{ marginTop: "1rem" }}><span className="label">Referral bps</span>
          <input value={form.referralBps} onChange={(e) => setForm({ ...form, referralBps: Number(e.target.value) })} />
        </label>
        <label className="label" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <input type="checkbox" checked={form.supportEnabled} onChange={(e) => setForm({ ...form, supportEnabled: e.target.checked })} />
          Support chat enabled
        </label>
        <div style={{ marginTop: "1.4rem" }}><LetterButton label="Save" type="submit" /></div>
      </form>
    </div>
  );
}
