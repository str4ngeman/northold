"use client";

import { useEffect, useState } from "react";

import type { PositionNft } from "@/lib/types";

export default function AdminPositions() {
  const [positions, setPositions] = useState<PositionNft[]>([]);

  useEffect(() => {
    void fetch("/api/admin/positions")
      .then((r) => r.json())
      .then((d) => setPositions(d.positions ?? []));
  }, []);

  return (
    <div>
      <p className="label">Positions</p>
      <h1 className="h2 hero-copy">All cards</h1>
      <div className="admin-table glass">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Owner</th>
              <th>Asset</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.tokenId}>
                <td>{p.tokenId}</td>
                <td>{p.owner}</td>
                <td>{p.assetId}</td>
                <td>{p.planId}</td>
                <td>{p.principalAmount}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
