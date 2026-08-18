"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/modal";
import { AdminPage, AdminTable, EmptyRow, StatusPill, Td, Th } from "@/components/admin/ui";
import { formatTokenId } from "@/lib/format";
import type { PositionNft } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  locked: "Locked",
  matured: "Matured",
  unlocked: "Redeemed",
  emergencyExited: "Exited early",
};

export default function AdminPositions() {
  const [positions, setPositions] = useState<PositionNft[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<PositionNft | null>(null);

  useEffect(() => {
    void fetch("/api/admin/positions")
      .then((r) => r.json())
      .then((d) => setPositions(d.positions ?? []));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((p) =>
      [String(p.tokenId), p.owner, p.assetId, p.planId, p.status].some((v) => v.toLowerCase().includes(q)),
    );
  }, [positions, query]);

  return (
    <AdminPage
      kicker="Positions"
      title="All cards"
      description="Every minted lock. Open a row for the full record."
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search id, owner, asset…"
        className="mb-4 h-11 w-full max-w-md rounded-full bg-white/5 px-4 text-sm outline-none ring-1 ring-white/10"
      />
      <AdminTable>
        <thead>
          <tr>
            <Th>#</Th>
            <Th>Owner</Th>
            <Th>Asset</Th>
            <Th>Plan</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && <EmptyRow cols={6} text="No positions yet." />}
          {filtered.map((p) => (
            <tr
              key={p.tokenId}
              className="cursor-pointer border-t border-white/6 hover:bg-white/[0.03]"
              onClick={() => setActive(p)}
            >
              <Td className="num font-medium">{formatTokenId(p.tokenId)}</Td>
              <Td className="max-w-[140px] truncate text-xs">{p.owner}</Td>
              <Td className="uppercase">{p.assetId}</Td>
              <Td className="capitalize">{p.planId}</Td>
              <Td className="num">{p.principalAmount}</Td>
              <Td>
                <StatusPill on={p.status === "locked"} label={STATUS_LABEL[p.status] ?? p.status} />
              </Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminModal
        open={Boolean(active)}
        onOpenChange={(next) => !next && setActive(null)}
        title={active ? `Position ${formatTokenId(active.tokenId)}` : "Position"}
        description="Positions are minted by users. This view is read-only."
      >
        {active && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Item label="Owner" value={active.owner} />
            <Item label="Asset" value={active.assetId} />
            <Item label="Plan" value={active.planId} />
            <Item label="Amount" value={String(active.principalAmount)} />
            <Item label="Status" value={STATUS_LABEL[active.status] ?? active.status} />
            <Item label="Claimed yield" value={String(active.claimedReward)} />
          </dl>
        )}
      </AdminModal>
    </AdminPage>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/4 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">{label}</dt>
      <dd className="mt-1 break-all">{value}</dd>
    </div>
  );
}
