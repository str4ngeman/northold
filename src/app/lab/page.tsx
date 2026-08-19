"use client";

import { LabPage } from "@/components/lab/ui";
import { Surface } from "@/components/ui/surface";
import { useLabState } from "@/hooks/use-lab-state";
import { formatAddress } from "@/lib/format";

const PROTOCOL = [
  ["Vault", "vault"],
  ["Card", "card"],
  ["Oracle", "oracle"],
  ["Lens", "lens"],
] as const;

export default function LabContractsPage() {
  const { state } = useLabState(8000);
  const contracts = state?.deployment?.contracts;
  const explorer = state?.network?.explorerUrl;
  const assets = state?.assets ?? [];

  return (
    <LabPage
      kicker="Contracts"
      title={state?.network?.shortLabel ?? "Protocol"}
      body="Northold contracts on this chain. Tokens are the ones already in Admin — they are not deployed here."
    >
      <p className="mb-4 text-xs text-[var(--ink-3)]">
        {state?.connected ? `block ${state.block ?? "—"}` : "RPC down"} · {state?.rpc}
      </p>

      <Surface className="overflow-auto p-1">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
            <tr>
              <th className="px-3 py-2 font-medium">Contract</th>
              <th className="px-3 py-2 font-medium">Address</th>
            </tr>
          </thead>
          <tbody>
            {PROTOCOL.map(([label, key]) => {
              const addr = contracts?.[key];
              return (
                <tr key={key} className="border-t border-white/6">
                  <td className="px-3 py-2">{label}</td>
                  <td className="num px-3 py-2 text-[var(--ink-2)]">
                    {addr && explorer ? (
                      <a href={`${explorer}/address/${addr}`} target="_blank" rel="noreferrer" className="text-[var(--light)]">
                        {formatAddress(addr)}
                      </a>
                    ) : addr ? (
                      formatAddress(addr)
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Surface>

      <p className="mt-6 mb-2 text-[11px] uppercase tracking-wider text-[var(--ink-3)]">Catalog tokens</p>
      <Surface className="overflow-auto p-1">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
            <tr>
              <th className="px-3 py-2 font-medium">Token</th>
              <th className="px-3 py-2 font-medium">Address</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-[var(--ink-3)]" colSpan={2}>
                  Set addresses in Admin → Tokens.
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr key={a.slug} className="border-t border-white/6">
                  <td className="px-3 py-2">{a.symbol}</td>
                  <td className="num px-3 py-2 text-[var(--ink-2)]">
                    {explorer ? (
                      <a href={`${explorer}/address/${a.address}`} target="_blank" rel="noreferrer" className="text-[var(--light)]">
                        {formatAddress(a.address)}
                      </a>
                    ) : (
                      formatAddress(a.address)
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Surface>
    </LabPage>
  );
}
