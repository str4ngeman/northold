"use client";

import { Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminModal } from "@/components/admin/modal";
import { AdminField, AdminPage, AdminTable, EmptyRow, StatusPill, Td, Th } from "@/components/admin/ui";
import { formatAddress } from "@/lib/format";

type UserRow = {
  id: string;
  email: string | null;
  address: string | null;
  name: string | null;
  role: string;
  referralCode: string;
  banned: boolean;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [banned, setBanned] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/users");
    setUsers((await res.json()).users ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.address, u.referralCode, u.role].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [users, query]);

  function openEdit(user: UserRow) {
    setEditing(user);
    setName(user.name ?? "");
    setRole(user.role);
    setBanned(user.banned);
  }

  async function submit() {
    if (!editing) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, banned }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Update failed");
      return;
    }
    toast.success("Member updated");
    setEditing(null);
    await load();
  }

  return (
    <AdminPage kicker="Users" title="Members" description="Search, then open a row to change role or suspend an account.">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, wallet…"
        className="mb-4 h-11 w-full max-w-md rounded-full bg-white/5 px-4 text-sm outline-none ring-1 ring-white/10"
      />
      <AdminTable>
        <thead>
          <tr>
            <Th>Member</Th>
            <Th>Wallet</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && <EmptyRow cols={5} text="No members match." />}
          {filtered.map((u) => (
            <tr
              key={u.id}
              className="cursor-pointer border-t border-white/6 hover:bg-white/[0.03]"
              onClick={() => openEdit(u)}
            >
              <Td>
                <p className="font-medium">{u.name || "—"}</p>
                <p className="text-xs text-[var(--ink-3)]">{u.email || u.referralCode}</p>
              </Td>
              <Td className="num text-xs">{u.address ? formatAddress(u.address) : "—"}</Td>
              <Td className="capitalize">{u.role}</Td>
              <Td>
                <StatusPill on={!u.banned} warn={u.banned} label={u.banned ? "Banned" : "Active"} />
              </Td>
              <Td className="text-right">
                <Pencil className="inline size-4 text-[var(--ink-3)]" />
              </Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminModal
        open={Boolean(editing)}
        onOpenChange={(next) => !next && setEditing(null)}
        title={editing?.name || editing?.email || "Member"}
        description={editing?.address ? formatAddress(editing.address) : editing?.email || undefined}
        onSubmit={submit}
        busy={busy}
        submitLabel="Save member"
      >
        <AdminField label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </AdminField>
        <AdminField label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </AdminField>
        <p className="text-xs text-[var(--ink-3)]">Referral code {editing?.referralCode}</p>
        <label className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
          <input type="checkbox" checked={banned} onChange={(e) => setBanned(e.target.checked)} />
          Suspend this account
        </label>
      </AdminModal>
    </AdminPage>
  );
}
