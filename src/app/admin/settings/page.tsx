"use client";

import { Pencil, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminModal } from "@/components/admin/modal";
import { AdminField, AdminPage, AdminTable, StatusPill, Td, Th } from "@/components/admin/ui";
import { CtaButton } from "@/components/ui/cta-button";
import { Surface } from "@/components/ui/surface";
import { WalletButton } from "@/components/wallet-button";
import { useOwnerTx } from "@/hooks/use-owner-tx";
import { formatAddress } from "@/lib/format";
import { explorerAddressUrl, NETWORKS, type NetworkId } from "@/lib/networks";
import { cn } from "@/lib/utils";

type Settings = {
  siteName: string;
  tagline: string;
  rewardSymbol: string;
  referralBps: number;
  supportEnabled: boolean;
};

type NetworkSummary = {
  id: NetworkId;
  name: string;
  mode: "lab" | "test" | "live";
  chainId: number;
  explorerUrl: string;
  active: boolean;
  deployed: boolean;
  vault: string | null;
  rpcUrl: string;
  tokenCount: number;
};

type NetworkState = {
  id: NetworkId;
  name: string;
  mode: "lab" | "test" | "live";
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  deployerAddress?: string;
  protocol: {
    vault: string;
    card: string;
    oracle: string;
    lens: string;
  } | null;
  tokens: Record<string, { address: string; decimals: number }>;
};

const ORDER: NetworkId[] = ["sepolia", "mainnet"];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [network, setNetwork] = useState<NetworkState | null>(null);
  const [networks, setNetworks] = useState<NetworkSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Settings>({
    siteName: "",
    tagline: "",
    rewardSymbol: "asset",
    referralBps: 500,
    supportEnabled: true,
  });
  const [rpcDraft, setRpcDraft] = useState("");
  const [protocolDraft, setProtocolDraft] = useState({ vault: "", card: "", oracle: "", lens: "" });
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState<NetworkId | null>(null);
  const [release, setRelease] = useState<{ configured: boolean; image?: string } | null>(null);
  const [updating, setUpdating] = useState(false);
  const ownerTx = useOwnerTx();

  async function load() {
    const [settingsRes, networkRes, releaseRes] = await Promise.all([
      fetch("/api/admin/settings"),
      fetch("/api/admin/network"),
      fetch("/api/admin/release"),
    ]);
    const settingsData = await settingsRes.json();
    const networkData = (await networkRes.json()) as { network?: NetworkState; networks?: NetworkSummary[] };
    if (settingsData.settings) {
      const next = {
        siteName: settingsData.settings.siteName ?? "",
        tagline: settingsData.settings.tagline ?? "",
        rewardSymbol: settingsData.settings.rewardSymbol ?? "asset",
        referralBps: settingsData.settings.referralBps ?? 500,
        supportEnabled: settingsData.settings.supportEnabled !== false,
      };
      setSettings(next);
      setDraft(next);
    }
    if (networkData.network) {
      setNetwork(networkData.network);
      setRpcDraft(networkData.network.rpcUrl);
      setProtocolDraft({
        vault: networkData.network.protocol?.vault ?? "",
        card: networkData.network.protocol?.card ?? "",
        oracle: networkData.network.protocol?.oracle ?? "",
        lens: networkData.network.protocol?.lens ?? "",
      });
    }
    setNetworks(networkData.networks ?? []);
    const releaseData = (await releaseRes.json()) as { configured?: boolean; image?: string };
    setRelease({ configured: Boolean(releaseData.configured), image: releaseData.image });
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!ownerTx.address) return;
    const id = window.setTimeout(() => void load(), 800);
    return () => window.clearTimeout(id);
  }, [ownerTx.address]);

  async function save() {
    setBusy(true);
    try {
      if (network?.protocol && settings && draft.referralBps !== settings.referralBps) {
        await ownerTx.setReferralBps(draft.referralBps);
      }
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Settings saved");
      setOpen(false);
      await ownerTx.refresh();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function pullRelease() {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/release", { method: "POST" });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(data.message || "Pull started. The site may restart in a moment.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  async function switchNetwork(id: NetworkId) {
    if (id === network?.id) return;
    if (id === "mainnet") {
      const ok = window.confirm(
        "Live mode points the entire app at Ethereum mainnet. Users will mint, claim, and unlock against real tokens. Continue?",
      );
      if (!ok) return;
    }
    setSwitching(id);
    try {
      const res = await fetch("/api/admin/network", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeNetwork: id, confirmLive: id === "mainnet" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not switch network");
      toast.success(`App is now on ${NETWORKS[id].name}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Switch failed");
    } finally {
      setSwitching(null);
    }
  }

  async function saveRpc() {
    if (!rpcDraft.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/network", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rpcUrl: rpcDraft.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save RPC");
      toast.success("RPC saved for this network");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveProtocol() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/network", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol: protocolDraft }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save protocol");
      toast.success("Protocol addresses saved for this network");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const rows = settings
    ? [
        { label: "Site name", value: settings.siteName },
        { label: "Tagline", value: settings.tagline || "—" },
        { label: "Reward", value: settings.rewardSymbol },
        { label: "Referral", value: `${(settings.referralBps / 100).toFixed(settings.referralBps % 100 === 0 ? 0 : 1)}%` },
        { label: "Support chat", value: settings.supportEnabled ? "On" : "Off", on: settings.supportEnabled },
      ]
    : [];

  return (
    <AdminPage
      kicker="Settings"
      title="Site configuration"
      description="The app runs on Sepolia. The connected MetaMask wallet is the deployer and is stored in the database. Lab deploy writes vault and token addresses here."
      action={
        <CtaButton className="h-11 px-5" onClick={() => settings && setOpen(true)}>
          <Pencil className="size-4" /> Edit
        </CtaButton>
      }
    >
      <Surface className="mb-8 p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Server</p>
        <p className="mt-1 text-lg font-semibold">Pull latest image</p>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          Same as SSH <span className="font-mono text-xs">docker compose pull && docker compose up -d --force-recreate</span>.
          New GHCR builds are also picked up automatically every five minutes.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CtaButton disabled={updating || release?.configured === false} onClick={() => void pullRelease()}>
            <RefreshCw className={`size-4 ${updating ? "animate-spin" : ""}`} />
            {updating ? "Updating…" : "Update from GHCR"}
          </CtaButton>
          <StatusPill
            on={Boolean(release?.configured)}
            label={release?.configured ? "Watchtower ready" : "Watchtower not on this host"}
          />
        </div>
        {release?.image ? <p className="mt-3 font-mono text-xs text-[var(--ink-3)]">{release.image}</p> : null}
      </Surface>

      <div className="mb-8 grid gap-3 lg:grid-cols-3">
        {ORDER.map((id) => {
          const summary = networks.find((item) => item.id === id);
          const def = NETWORKS[id];
          const active = network?.id === id;
          return (
            <button
              key={id}
              type="button"
              disabled={Boolean(switching)}
              onClick={() => void switchNetwork(id)}
              className={cn(
                "rounded-[1.75rem] p-5 text-left ring-1 transition-colors",
                active ? "bg-white/10 ring-[var(--light)]" : "bg-[var(--bg-raise)]/85 ring-white/8 hover:ring-white/16",
              )}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">
                {def.mode === "lab" ? "Local" : def.mode === "test" ? "Test" : "Live"}
              </p>
              <p className="mt-2 text-lg font-semibold">{def.shortLabel}</p>
              <p className="mt-1 text-xs text-[var(--ink-3)]">chain {def.chainId}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill on={active} label={active ? "Active" : switching === id ? "Switching" : "Standby"} />
                <StatusPill on={Boolean(summary?.deployed)} label={summary?.deployed ? "Vault live" : "No vault"} />
              </div>
            </button>
          );
        })}
      </div>

      {network ? (
        <>
        <Surface className="mb-8 p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Deployer</p>
          <p className="mt-1 text-lg font-semibold font-mono">
            {network.deployerAddress ? formatAddress(network.deployerAddress) : "Not saved yet"}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            {ownerTx.address
              ? `Connected MetaMask ${formatAddress(ownerTx.address)}${
                  network.deployerAddress && ownerTx.address.toLowerCase() === network.deployerAddress.toLowerCase()
                    ? " — this is the saved owner"
                    : " — connecting as admin saves this address"
                }`
              : "Connect MetaMask as admin. That wallet becomes the protocol owner in the database."}
          </p>
          <div className="mt-4">
            <WalletButton />
          </div>
        </Surface>

        <Surface className="mb-8 p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--ink-3)]">Active network</p>
          <p className="mt-1 text-lg font-semibold">{network.name}</p>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Wallet, catalog, and live reads all follow this chain. Token addresses for the other two networks stay put.
          </p>
          <div className="mt-4 flex max-w-xl gap-2">
            <input
              value={rpcDraft}
              onChange={(e) => setRpcDraft(e.target.value)}
              className="h-12 flex-1 rounded-full bg-white/4 px-4 font-mono text-sm outline-none ring-1 ring-white/10 focus:ring-[var(--light)]"
              placeholder="RPC URL"
            />
            <CtaButton variant="ghost" disabled={busy} onClick={() => void saveRpc()}>
              Save RPC
            </CtaButton>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {(["vault", "card", "oracle", "lens"] as const).map((key) => (
              <label key={key} className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
                {key}
                <input
                  value={protocolDraft[key]}
                  onChange={(e) => setProtocolDraft({ ...protocolDraft, [key]: e.target.value })}
                  className="mt-1 h-11 w-full rounded-full bg-white/4 px-4 font-mono text-xs normal-case outline-none ring-1 ring-white/10 focus:ring-[var(--light)]"
                  placeholder="0x…"
                />
              </label>
            ))}
          </div>
          <div className="mt-3">
            <CtaButton variant="ghost" disabled={busy} onClick={() => void saveProtocol()}>
              Save protocol addresses
            </CtaButton>
          </div>
          {network.protocol ? (
            <p className="mt-4 text-xs text-[var(--ink-3)]">
              Explorer:{" "}
              {network.explorerUrl ? (
                <a href={explorerAddressUrl(network.explorerUrl, network.protocol.vault)} target="_blank" rel="noreferrer" className="text-[var(--light)]">
                  open vault
                </a>
              ) : (
                "no explorer"
              )}
            </p>
          ) : (
            <p className="mt-4 text-sm text-[var(--ink-3)]">
              No vault on this network yet. Deploy from Lab, or paste addresses after a one-time token deploy.
            </p>
          )}
        </Surface>
        </>
      ) : null}

      <AdminTable>
        <thead>
          <tr>
            <Th>Setting</Th>
            <Th>Value</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="cursor-pointer border-t border-white/6 hover:bg-white/[0.03]"
              onClick={() => setOpen(true)}
            >
              <Td className="text-[var(--ink-2)]">{row.label}</Td>
              <Td>
                {"on" in row ? <StatusPill on={Boolean(row.on)} label={row.value} /> : row.value}
              </Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminModal
        open={open}
        onOpenChange={setOpen}
        title="Edit settings"
        onSubmit={save}
        busy={busy}
      >
        <AdminField label="Site name">
          <input value={draft.siteName} onChange={(e) => setDraft({ ...draft, siteName: e.target.value })} />
        </AdminField>
        <AdminField label="Tagline">
          <input value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
        </AdminField>
        <AdminField label="Reward label" hint="Yield is always paid in the locked token. This is display-only.">
          <input value={draft.rewardSymbol} onChange={(e) => setDraft({ ...draft, rewardSymbol: e.target.value })} />
        </AdminField>
        <AdminField label="Referral %" hint="5 means 5%. If a vault is live, MetaMask signs setReferralBps first.">
          <input
            value={String(draft.referralBps / 100)}
            onChange={(e) => setDraft({ ...draft, referralBps: Math.round(Number(e.target.value) * 100) })}
          />
        </AdminField>
        <label className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
          <input
            type="checkbox"
            checked={draft.supportEnabled}
            onChange={(e) => setDraft({ ...draft, supportEnabled: e.target.checked })}
          />
          Support chat enabled
        </label>
      </AdminModal>
    </AdminPage>
  );
}
