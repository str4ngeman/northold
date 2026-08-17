"use client";

import { useEffect, useState } from "react";

export default function AdminReferrals() {
  const [rows, setRows] = useState<{ user: { email: string | null; address: string | null }; referrer: { email: string | null; address: string | null } | null }[]>([]);

  useEffect(() => {
    void fetch("/api/admin/referrals")
      .then((r) => r.json())
      .then((d) => setRows(d.referrals ?? []));
  }, []);

  return (
    <div>
      <p className="label">Referrals</p>
      <h1 className="h2 hero-copy">Attribution</h1>
      <div className="admin-table glass">
        <table>
          <thead>
            <tr>
              <th>New user</th>
              <th>Referred by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.user.email || row.user.address}</td>
                <td>{row.referrer?.email || row.referrer?.address || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
