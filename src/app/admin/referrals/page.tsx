"use client";

import { useEffect, useState } from "react";

import { AdminModal } from "@/components/admin/modal";
import { AdminPage, AdminTable, EmptyRow, Td, Th } from "@/components/admin/ui";
import { formatAddress } from "@/lib/format";

type Row = {
  user: { email: string | null; address: string | null; name?: string | null };
  referrer: { email: string | null; address: string | null; name?: string | null } | null;
};

function label(person: { email: string | null; address: string | null; name?: string | null } | null) {
  if (!person) return "—";
  return person.name || person.email || (person.address ? formatAddress(person.address) : "—");
}

export default function AdminReferrals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [active, setActive] = useState<Row | null>(null);

  useEffect(() => {
    void fetch("/api/admin/referrals")
      .then((r) => r.json())
      .then((d) => setRows(d.referrals ?? []));
  }, []);

  return (
    <AdminPage
      kicker="Referrals"
      title="Attribution"
      description="Who brought whom. Open a row for emails and wallets."
    >
      <AdminTable>
        <thead>
          <tr>
            <Th>New member</Th>
            <Th>Referred by</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={2} text="No referral attributions yet." />}
          {rows.map((row, i) => (
            <tr
              key={i}
              className="cursor-pointer border-t border-white/6 hover:bg-white/[0.03]"
              onClick={() => setActive(row)}
            >
              <Td>{label(row.user)}</Td>
              <Td>{label(row.referrer)}</Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminModal
        open={Boolean(active)}
        onOpenChange={(next) => !next && setActive(null)}
        title="Referral"
      >
        {active && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Person title="New member" person={active.user} />
            <Person title="Referrer" person={active.referrer} />
          </div>
        )}
      </AdminModal>
    </AdminPage>
  );
}

function Person({
  title,
  person,
}: {
  title: string;
  person: Row["user"] | null;
}) {
  return (
    <div className="rounded-2xl bg-white/4 p-3 text-sm">
      <p className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">{title}</p>
      <p className="mt-2 font-medium">{person?.name || "—"}</p>
      <p className="mt-1 text-[var(--ink-2)]">{person?.email || "No email"}</p>
      <p className="mt-1 text-xs text-[var(--ink-3)]">
        {person?.address ? formatAddress(person.address) : "No wallet"}
      </p>
    </div>
  );
}
