"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LetterButton } from "@/components/kinetic/letter-button";

type PlanRow = {
  _id: string;
  slug: string;
  name: string;
  tagline: string;
  lockSeconds: number;
  minUsd: number;
  maxUsd: number;
  apyBps: number;
  emergencyFeeBps: number;
  active: boolean;
};

export default function AdminPlans() {
  const [plans, setPlans] = useState<PlanRow[]>([]);

  async function load() {
    const res = await fetch("/api/admin/plans");
    const data = await res.json();
    setPlans(data.plans ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(plan: PlanRow) {
    const res = await fetch(`/api/admin/plans/${plan._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!res.ok) toast.error("Save failed");
    else toast.success("Plan saved");
    await load();
  }

  return (
    <div>
      <p className="label">Plans</p>
      <h1 className="h2 hero-copy">Configure locks</h1>
      <CreatePlan onCreated={() => void load()} />
      <div className="admin-stack">
        {plans.map((plan) => (
          <form
            key={plan._id}
            className="glass admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save(plan);
            }}
          >
            <strong>{plan.slug}</strong>
            <Grid>
              <Field label="Name" value={plan.name} onChange={(v) => (plan.name = v)} />
              <Field label="Tagline" value={plan.tagline} onChange={(v) => (plan.tagline = v)} />
              <Field label="Lock seconds" value={String(plan.lockSeconds)} onChange={(v) => (plan.lockSeconds = Number(v))} />
              <Field label="Min USD" value={String(plan.minUsd)} onChange={(v) => (plan.minUsd = Number(v))} />
              <Field label="Max USD" value={String(plan.maxUsd)} onChange={(v) => (plan.maxUsd = Number(v))} />
              <Field label="APY bps" value={String(plan.apyBps)} onChange={(v) => (plan.apyBps = Number(v))} />
              <Field label="Emergency bps" value={String(plan.emergencyFeeBps)} onChange={(v) => (plan.emergencyFeeBps = Number(v))} />
            </Grid>
            <label className="label" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <input
                type="checkbox"
                defaultChecked={plan.active}
                onChange={(e) => {
                  plan.active = e.target.checked;
                }}
              />
              Active
            </label>
            <div style={{ marginTop: "1rem" }}>
              <LetterButton label="Save" type="submit" />
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="admin-grid">{children}</div>;
}

function CreatePlan({ onCreated }: { onCreated: () => void }) {
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: data.get("slug"),
        name: data.get("name"),
        tagline: data.get("tagline"),
        lockSeconds: Number(data.get("lockSeconds")),
        minUsd: Number(data.get("minUsd")),
        maxUsd: Number(data.get("maxUsd")),
        apyBps: Number(data.get("apyBps")),
        emergencyFeeBps: Number(data.get("emergencyFeeBps")),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Could not create plan");
      return;
    }
    e.currentTarget.reset();
    toast.success("Plan created");
    onCreated();
  }

  return (
    <form className="glass admin-form" style={{ marginTop: "var(--s-5)" }} onSubmit={(e) => void create(e)}>
      <strong>New plan</strong>
      <Grid>
        <label className="field"><span className="label">Slug</span><input name="slug" required /></label>
        <label className="field"><span className="label">Name</span><input name="name" required /></label>
        <label className="field"><span className="label">Tagline</span><input name="tagline" /></label>
        <label className="field"><span className="label">Lock seconds</span><input name="lockSeconds" defaultValue={2592000} /></label>
        <label className="field"><span className="label">Min USD</span><input name="minUsd" defaultValue={100} /></label>
        <label className="field"><span className="label">Max USD</span><input name="maxUsd" defaultValue={10000} /></label>
        <label className="field"><span className="label">APY bps</span><input name="apyBps" defaultValue={800} /></label>
        <label className="field"><span className="label">Emergency bps</span><input name="emergencyFeeBps" defaultValue={1500} /></label>
      </Grid>
      <div style={{ marginTop: "1rem" }}>
        <LetterButton label={busy ? "Creating" : "Create plan"} type="submit" disabled={busy} />
      </div>
    </form>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
      />
    </label>
  );
}
