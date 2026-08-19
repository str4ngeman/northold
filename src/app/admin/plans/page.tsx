"use client";

import { Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminModal } from "@/components/admin/modal";
import { AdminField, AdminPage, AdminTable, EmptyRow, StatusPill, Td, Th } from "@/components/admin/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { formatApy, formatFee, formatLock, formatUsd } from "@/lib/format";
import { DAY_SECONDS } from "@/lib/math";
import { useOwnerTx } from "@/hooks/use-owner-tx";
import { useLabUi } from "@/hooks/use-lab-ui";

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
  onChainId?: number | null;
};

type Draft = {
  slug: string;
  name: string;
  tagline: string;
  lockDays: string;
  minUsd: string;
  maxUsd: string;
  apy: string;
  emergencyFee: string;
  active: boolean;
};

const emptyDraft = (): Draft => ({
  slug: "",
  name: "",
  tagline: "",
  lockDays: "30",
  minUsd: "100",
  maxUsd: "10000",
  apy: "8",
  emergencyFee: "15",
  active: true,
});

function toDraft(plan?: PlanRow | null): Draft {
  if (!plan) return emptyDraft();
  return {
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline,
    lockDays: String(Math.round(plan.lockSeconds / DAY_SECONDS)),
    minUsd: String(plan.minUsd),
    maxUsd: String(plan.maxUsd),
    apy: String(plan.apyBps / 100),
    emergencyFee: String(plan.emergencyFeeBps / 100),
    active: plan.active,
  };
}

function payload(draft: Draft) {
  return {
    slug: draft.slug.trim().toLowerCase(),
    name: draft.name.trim(),
    tagline: draft.tagline.trim(),
    lockSeconds: Number(draft.lockDays) * DAY_SECONDS,
    minUsd: Number(draft.minUsd),
    maxUsd: Number(draft.maxUsd),
    apyBps: Math.round(Number(draft.apy) * 100),
    emergencyFeeBps: Math.round(Number(draft.emergencyFee) * 100),
    active: draft.active,
  };
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [vaultLive, setVaultLive] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const ownerTx = useOwnerTx();
  const labUi = useLabUi();

  async function load() {
    const res = await fetch("/api/admin/plans");
    const data = (await res.json()) as { plans?: PlanRow[]; vaultLive?: boolean };
    setPlans(data.plans ?? []);
    setVaultLive(Boolean(data.vaultLive));
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft());
    setCreating(true);
  }

  function openEdit(plan: PlanRow) {
    setCreating(false);
    setDraft(toDraft(plan));
    setEditing(plan);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  async function submit() {
    const body = payload(draft);
    if (!body.name || !Number.isFinite(body.lockSeconds) || body.lockSeconds <= 0) {
      toast.error("Name and lock days are required");
      return;
    }
    setBusy(true);
    try {
      const res = creating
        ? await fetch("/api/admin/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/admin/plans/${editing?._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = (await res.json()) as { error?: string; plan?: PlanRow; vaultLive?: boolean };
      if (!res.ok) {
        toast.error(data.error || (creating ? "Could not create plan" : "Save failed"));
        return;
      }
      if (vaultLive) {
        const onChainId = await ownerTx.syncPlan(
          {
            slug: body.slug,
            lockSeconds: body.lockSeconds,
            minUsd: body.minUsd,
            maxUsd: body.maxUsd,
            apyBps: body.apyBps,
            emergencyFeeBps: body.emergencyFeeBps,
            active: body.active,
          },
          creating ? undefined : editing?.onChainId,
        );
        const id = data.plan?._id ?? editing?._id;
        if (id) {
          await fetch(`/api/admin/plans/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, onChainId }),
          });
        }
        toast.success(creating ? "Plan created on-chain" : "Plan saved on-chain");
        await ownerTx.refresh();
      } else {
        toast.success(creating ? "Plan created (deploy later to put it on-chain)" : "Plan saved");
      }
      close();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "On-chain write failed");
    } finally {
      setBusy(false);
    }
  }

  const open = creating || Boolean(editing);

  return (
    <AdminPage
      kicker="Bearings"
      title="Lock bearings"
      description={
        vaultLive
          ? "Edits write to Mongo, then the connected wallet signs the vault update. Cards already minted keep the coupon they locked in."
          : labUi
            ? "One row per bearing. Deploy from Lab to push these onto the hold."
            : "One row per bearing. Saving writes to the vault when it is live."
      }
      action={
        <CtaButton onClick={openCreate} className="h-11 px-5">
          <Plus className="size-4" /> New bearing
        </CtaButton>
      }
    >
      <AdminTable>
        <thead>
          <tr>
            <Th>Bearing</Th>
            <Th>Lock</Th>
            <Th>APY</Th>
            <Th>Range</Th>
            <Th>Exit fee</Th>
            <Th>Chain</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {plans.length === 0 && <EmptyRow cols={8} text="No plans yet. Create the first lock." />}
          {plans.map((plan) => (
            <tr
              key={plan._id}
              className="cursor-pointer border-t border-white/6 hover:bg-white/[0.03]"
              onClick={() => openEdit(plan)}
            >
              <Td>
                <p className="font-medium">{plan.name}</p>
                <p className="text-xs text-[var(--ink-3)]">{plan.tagline || plan.slug}</p>
              </Td>
              <Td>{formatLock(plan.lockSeconds)}</Td>
              <Td className="text-[var(--gain)]">{formatApy(plan.apyBps)}</Td>
              <Td>
                {formatUsd(plan.minUsd, 0)}–{formatUsd(plan.maxUsd, 0)}
              </Td>
              <Td>{formatFee(plan.emergencyFeeBps)}</Td>
              <Td className="text-xs text-[var(--ink-3)]">
                {plan.onChainId ? `#${plan.onChainId}` : vaultLive ? "pending" : "—"}
              </Td>
              <Td>
                <StatusPill on={plan.active} />
              </Td>
              <Td className="text-right">
                <Pencil className="inline size-4 text-[var(--ink-3)]" />
              </Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminModal
        open={open}
        onOpenChange={(next) => !next && close()}
        title={creating ? "New bearing" : `Edit ${editing?.name ?? "bearing"}`}
        description={
          vaultLive
            ? "APY and exit fee are percentages. Lock length is in days. Saving asks the connected wallet to call updatePlan."
            : "APY and exit fee are percentages. Lock length is in days."
        }
        onSubmit={submit}
        busy={busy}
        submitLabel={creating ? "Create bearing" : "Save bearing"}
      >
        {creating && (
          <AdminField label="Slug" hint="Used in URLs. Lowercase, no spaces.">
            <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} required />
          </AdminField>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Name">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          </AdminField>
          <AdminField label="Lock (days)">
            <input value={draft.lockDays} onChange={(e) => setDraft({ ...draft, lockDays: e.target.value })} />
          </AdminField>
          <AdminField label="APY %" hint="8 means 8% APY">
            <input value={draft.apy} onChange={(e) => setDraft({ ...draft, apy: e.target.value })} />
          </AdminField>
          <AdminField label="Early exit %">
            <input value={draft.emergencyFee} onChange={(e) => setDraft({ ...draft, emergencyFee: e.target.value })} />
          </AdminField>
          <AdminField label="Min USD">
            <input value={draft.minUsd} onChange={(e) => setDraft({ ...draft, minUsd: e.target.value })} />
          </AdminField>
          <AdminField label="Max USD">
            <input value={draft.maxUsd} onChange={(e) => setDraft({ ...draft, maxUsd: e.target.value })} />
          </AdminField>
        </div>
        <AdminField label="Tagline">
          <input value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
        </AdminField>
        <label className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
          <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
          Visible to users
        </label>
        {vaultLive && !creating ? (
          <p className="text-xs text-[var(--ink-3)]">
            Existing position cards keep the APY, lock, and exit fee they minted with. Only new locks pick up this edit.
          </p>
        ) : null}
      </AdminModal>
    </AdminPage>
  );
}
