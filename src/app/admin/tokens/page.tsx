"use client";

import { Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminModal } from "@/components/admin/modal";
import { AdminField, AdminPage, AdminTable, EmptyRow, StatusPill, Td, Th } from "@/components/admin/ui";
import { TokenMark } from "@/components/brand/token-mark";
import { CtaButton } from "@/components/ui/cta-button";
import { useOwnerTx } from "@/hooks/use-owner-tx";
import { formatAddress, formatUsd } from "@/lib/format";
import type { Address } from "viem";

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
  network?: "sepolia" | "mainnet" | "custom";
  onVault?: boolean;
};

type Draft = {
  slug: string;
  symbol: string;
  name: string;
  address: string;
  decimals: string;
  priceUsd: string;
  color: string;
  active: boolean;
};

const emptyDraft = (): Draft => ({
  slug: "",
  symbol: "",
  name: "",
  address: "",
  decimals: "18",
  priceUsd: "1",
  color: "#d9b56a",
  active: true,
});

function toDraft(token?: TokenRow | null): Draft {
  if (!token) return emptyDraft();
  return {
    slug: token.slug,
    symbol: token.symbol,
    name: token.name,
    address: token.address,
    decimals: String(token.decimals),
    priceUsd: String(token.priceUsd),
    color: token.color,
    active: token.active,
  };
}

export default function AdminTokens() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [vaultLive, setVaultLive] = useState(false);
  const [networkName, setNetworkName] = useState("the active network");
  const [editing, setEditing] = useState<TokenRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const ownerTx = useOwnerTx();

  async function load() {
    const res = await fetch("/api/admin/tokens");
    const data = (await res.json()) as { tokens?: TokenRow[]; vaultLive?: boolean; network?: string };
    setTokens(data.tokens ?? []);
    setVaultLive(Boolean(data.vaultLive));
    if (data.network) setNetworkName(data.network);
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft());
    setCreating(true);
  }

  function openEdit(token: TokenRow) {
    setCreating(false);
    setDraft(toDraft(token));
    setEditing(token);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  async function submit() {
    const body = {
      slug: draft.slug.trim().toLowerCase(),
      symbol: draft.symbol.trim(),
      name: draft.name.trim(),
      address: draft.address.trim(),
      decimals: Number(draft.decimals),
      priceUsd: Number(draft.priceUsd),
      color: draft.color,
      active: draft.active,
    };
    if (!body.symbol || !body.name || !body.address) {
      toast.error("Symbol, name, and address are required");
      return;
    }
    setBusy(true);
    try {
      const res = creating
        ? await fetch("/api/admin/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/admin/tokens/${editing?._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || (creating ? "Could not create token" : "Save failed"));
        return;
      }
      if (vaultLive) {
        const tokenAddr = body.address as Address;
        if (creating || body.active !== editing?.active) {
          await ownerTx.setAsset(tokenAddr, body.active);
        }
        if (creating || body.priceUsd !== editing?.priceUsd) {
          await ownerTx.setPrice(tokenAddr, body.priceUsd);
        }
        toast.success(creating ? "Token created on-chain" : "Token saved on-chain");
        await ownerTx.refresh();
      } else {
        toast.success(creating ? "Token created" : "Token saved");
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
  const bound = Boolean(vaultLive && editing?.onVault && !creating);

  return (
    <AdminPage
      kicker="Tokens"
      title="Stakeable assets"
      description={
        vaultLive
          ? `Addresses follow ${networkName}. Price and availability edits ask the connected MetaMask wallet to sign.`
          : "Placeholder assets until you deploy. Switching Test/Live/Local never overwrites the other networks."
      }
      action={
        <CtaButton onClick={openCreate} className="h-11 px-5">
          <Plus className="size-4" /> New token
        </CtaButton>
      }
    >
      <AdminTable>
        <thead>
          <tr>
            <Th>Asset</Th>
            <Th>Address</Th>
            <Th>Price</Th>
            <Th>Decimals</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {tokens.length === 0 && <EmptyRow cols={6} text="No tokens yet." />}
          {tokens.map((token) => (
            <tr
              key={token._id}
              className="cursor-pointer border-t border-white/6 hover:bg-white/[0.03]"
              onClick={() => openEdit(token)}
            >
              <Td>
                <div className="flex items-center gap-3">
                  <TokenMark id={token.slug} symbol={token.symbol} color={token.color} size={32} />
                  <div>
                    <p className="font-medium">{token.symbol}</p>
                    <p className="text-xs text-[var(--ink-3)]">{token.name}</p>
                  </div>
                </div>
              </Td>
              <Td>
                <p className="font-mono text-xs">{formatAddress(token.address)}</p>
                <p className="text-[11px] text-[var(--ink-3)]">
                  {token.network === "sepolia"
                    ? "Sepolia"
                    : token.network === "mainnet"
                      ? "Ethereum mainnet"
                      : "Unbound"}
                </p>
              </Td>
              <Td>{formatUsd(token.priceUsd, token.priceUsd >= 100 ? 0 : 2)}</Td>
              <Td>{token.decimals}</Td>
              <Td>
                <StatusPill on={token.active} />
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
        title={creating ? "New token" : `Edit ${editing?.symbol ?? "token"}`}
        onSubmit={submit}
        busy={busy}
        submitLabel={creating ? "Create token" : "Save token"}
      >
        {creating && (
          <AdminField label="Slug">
            <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} required />
          </AdminField>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Symbol">
            <input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} required />
          </AdminField>
          <AdminField label="Name">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          </AdminField>
          <AdminField label="Decimals" hint={bound ? "Fixed by the live token contract." : undefined}>
            <input
              value={draft.decimals}
              onChange={(e) => setDraft({ ...draft, decimals: e.target.value })}
              disabled={bound}
            />
          </AdminField>
          <AdminField label="Price USD">
            <input value={draft.priceUsd} onChange={(e) => setDraft({ ...draft, priceUsd: e.target.value })} />
          </AdminField>
        </div>
        <AdminField
          label="Contract address"
          hint={bound ? `Locked to the ${networkName} deployment.` : "Saved onto the active network only."}
        >
          <input
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            required
            disabled={bound}
            className="font-mono"
          />
        </AdminField>
        <AdminField label="Color">
          <input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
        </AdminField>
        <label className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
          <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
          Available to lock
        </label>
      </AdminModal>
    </AdminPage>
  );
}
