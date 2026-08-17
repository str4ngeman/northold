"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LetterButton } from "@/components/kinetic/letter-button";

type TokenRow = {
  _id: string;
  slug: string;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  priceUsd: number;
  color: string;
  active: boolean;
};

export default function AdminTokens() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);

  async function load() {
    const res = await fetch("/api/admin/tokens");
    setTokens((await res.json()).tokens ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(token: TokenRow) {
    const res = await fetch(`/api/admin/tokens/${token._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(token),
    });
    toast[res.ok ? "success" : "error"](res.ok ? "Token saved" : "Save failed");
    await load();
  }

  return (
    <div>
      <p className="label">Tokens</p>
      <h1 className="h2 hero-copy">Stakeable assets</h1>
      <CreateToken onCreated={() => void load()} />
      <div className="admin-stack">
        {tokens.map((token) => (
          <form
            key={token._id}
            className="glass admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void save({
                ...token,
                symbol: String(data.get("symbol")),
                name: String(data.get("name")),
                address: String(data.get("address")),
                decimals: Number(data.get("decimals")),
                priceUsd: Number(data.get("priceUsd")),
                color: String(data.get("color")),
                active: data.get("active") === "on",
              });
            }}
          >
            <strong>{token.slug}</strong>
            <div className="admin-grid">
              <label className="field"><span className="label">Symbol</span><input name="symbol" defaultValue={token.symbol} /></label>
              <label className="field"><span className="label">Name</span><input name="name" defaultValue={token.name} /></label>
              <label className="field"><span className="label">Address</span><input name="address" defaultValue={token.address} /></label>
              <label className="field"><span className="label">Decimals</span><input name="decimals" defaultValue={token.decimals} /></label>
              <label className="field"><span className="label">Price USD</span><input name="priceUsd" defaultValue={token.priceUsd} /></label>
              <label className="field"><span className="label">Color</span><input name="color" defaultValue={token.color} /></label>
            </div>
            <label className="label" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <input type="checkbox" name="active" defaultChecked={token.active} /> Active
            </label>
            <div style={{ marginTop: "1rem" }}><LetterButton label="Save" type="submit" /></div>
          </form>
        ))}
      </div>
    </div>
  );
}

function CreateToken({ onCreated }: { onCreated: () => void }) {
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    const res = await fetch("/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: data.get("slug"),
        symbol: data.get("symbol"),
        name: data.get("name"),
        address: data.get("address"),
        decimals: Number(data.get("decimals")),
        priceUsd: Number(data.get("priceUsd")),
        color: data.get("color"),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Could not create token");
      return;
    }
    e.currentTarget.reset();
    toast.success("Token created");
    onCreated();
  }

  return (
    <form className="glass admin-form" style={{ marginTop: "var(--s-5)" }} onSubmit={(e) => void create(e)}>
      <strong>New token</strong>
      <div className="admin-grid">
        <label className="field"><span className="label">Slug</span><input name="slug" required /></label>
        <label className="field"><span className="label">Symbol</span><input name="symbol" required /></label>
        <label className="field"><span className="label">Name</span><input name="name" required /></label>
        <label className="field"><span className="label">Address</span><input name="address" required /></label>
        <label className="field"><span className="label">Decimals</span><input name="decimals" defaultValue={18} /></label>
        <label className="field"><span className="label">Price USD</span><input name="priceUsd" defaultValue={1} /></label>
        <label className="field"><span className="label">Color</span><input name="color" defaultValue="#e2c36d" /></label>
      </div>
      <div style={{ marginTop: "1rem" }}>
        <LetterButton label={busy ? "Creating" : "Create token"} type="submit" disabled={busy} />
      </div>
    </form>
  );
}
