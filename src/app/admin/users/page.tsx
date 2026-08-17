"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LetterButton } from "@/components/kinetic/letter-button";

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

  async function load() {
    const res = await fetch("/api/admin/users");
    setUsers((await res.json()).users ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) toast.error("Update failed");
    await load();
  }

  return (
    <div>
      <p className="label">Users</p>
      <h1 className="h2 hero-copy">Members</h1>
      <div className="admin-table glass">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Wallet</th>
              <th>Role</th>
              <th>Ref</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.address}</td>
                <td>{u.role}</td>
                <td>{u.referralCode}</td>
                <td>
                  <LetterButton
                    label={u.role === "admin" ? "Make user" : "Make admin"}
                    variant="ghost"
                    onClick={() => void patch(u.id, { role: u.role === "admin" ? "user" : "admin" })}
                  />
                  <LetterButton
                    label={u.banned ? "Reinstate" : "Ban"}
                    variant="ghost"
                    onClick={() => void patch(u.id, { banned: !u.banned })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
