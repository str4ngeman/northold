"use client";

import { useEffect, useState } from "react";

export default function AdminHome() {
  const [stats, setStats] = useState<{ users: number; positions: number; openThreads: number; admins: number } | null>(null);

  useEffect(() => {
    void fetch("/api/admin/overview")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div>
      <p className="label">Overview</p>
      <h1 className="h2 hero-copy">Control plane</h1>
      <div className="admin-cards">
        <Stat label="Users" value={stats?.users} />
        <Stat label="Positions" value={stats?.positions} />
        <Stat label="Open support" value={stats?.openThreads} />
        <Stat label="Admins" value={stats?.admins} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="glass" style={{ padding: "1.4rem" }}>
      <p className="label">{label}</p>
      <p className="h2" style={{ marginTop: "0.6rem" }}>{value ?? "—"}</p>
    </div>
  );
}
