"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";

import { FieldMap } from "@/components/field/field-map";
import { TokenMark } from "@/components/brand/token-mark";
import { Row } from "@/components/kit";
import { TOKENS } from "@/lib/dummy";
import { defaultAmount } from "@/lib/field/claims";
import type { SerializedClaim } from "@/lib/field/serialize";
import {
  coordLabel,
  DISTRICTS,
  districtPlan,
  districtSeam,
  getDistrict,
  sitesIn,
  type DistrictId,
  type Site,
} from "@/lib/field/world";
import { formatLock, formatTokenAmount, formatUsd } from "@/lib/format";
import { principalUsd } from "@/lib/math";
import { gradeLabel } from "@/lib/seams";
import { cn } from "@/lib/utils";

export function FieldExplorer() {
  const [claims, setClaims] = useState<SerializedClaim[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [focus, setFocus] = useState<DistrictId | null>(null);

  async function refresh() {
    const res = await fetch("/api/universe/claims");
    const data = (await res.json()) as { claims?: SerializedClaim[] };
    setClaims(data.claims ?? []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const bySite = useMemo(() => new Map(claims.map((claim) => [claim.siteId, claim])), [claims]);
  const pegged = useMemo(
    () =>
      new Map(
        claims.map((claim) => [claim.siteId, { color: claim.seam.color, symbol: claim.token.symbol }] as const),
      ),
    [claims],
  );

  return (
    <div className="grid h-full min-h-0 grid-rows-[1fr_auto] lg:grid-cols-[1fr_398px] lg:grid-rows-1">
      <div className="relative min-h-[56svh] border-b border-[var(--rule)] lg:min-h-0 lg:border-b-0 lg:border-r">
        <FieldMap pegged={pegged} selectedId={site?.id ?? null} onSelect={setSite} focusDistrict={focus} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-4">
          <div className="panel pointer-events-auto flex overflow-x-auto bg-[#060607]/85 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setFocus(null)}
              className={cn(
                "num shrink-0 px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors",
                focus === null ? "bg-bone text-[#0b0b0c]" : "text-bone-3 hover:text-bone",
              )}
            >
              All ground
            </button>
            {DISTRICTS.map((district) => {
              const seam = districtSeam(district.id);
              const on = focus === district.id;
              return (
                <button
                  key={district.id}
                  type="button"
                  onClick={() => setFocus(on ? null : district.id)}
                  className="num shrink-0 border-l border-[var(--rule)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors"
                  style={{ color: on ? "#0b0b0c" : "var(--bone-3)", background: on ? seam.color : "transparent" }}
                >
                  {district.code}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="flex min-h-0 flex-col overflow-y-auto bg-[#0b0b0c] lg:h-full">
        {site ? (
          <SiteDossier
            site={site}
            claim={bySite.get(site.id) ?? null}
            onClose={() => setSite(null)}
            onPegged={refresh}
          />
        ) : (
          <FieldIndex claims={claims} onFocus={setFocus} focus={focus} />
        )}
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function FieldIndex({
  claims,
  focus,
  onFocus,
}: {
  claims: SerializedClaim[];
  focus: DistrictId | null;
  onFocus: (id: DistrictId | null) => void;
}) {
  return (
    <div className="p-5">
      <p className="tag">Field notes</p>
      <h1 className="display mt-3 text-3xl">The ground, described.</h1>
      <p className="mt-3 text-sm leading-relaxed text-bone-2">
        One continent, six districts, {DISTRICTS.reduce((n, d) => n + sitesIn(d.id).length, 0)} surveyed sites. Every
        contour on the sheet is cut from the same elevation model, so a coordinate always means the same ridge. Pick a
        site to read its assay and peg it.
      </p>

      <div className="mt-7 space-y-px">
        {DISTRICTS.map((district) => {
          const seam = districtSeam(district.id);
          const plan = districtPlan(district.id);
          const sites = sitesIn(district.id);
          const taken = claims.filter((claim) => claim.districtId === district.id).length;
          const on = focus === district.id;

          return (
            <button
              key={district.id}
              type="button"
              onClick={() => onFocus(on ? null : district.id)}
              className={cn(
                "group block w-full border border-transparent p-4 text-left transition-colors",
                on ? "bg-[var(--slate)]" : "hover:bg-[var(--slate)]",
              )}
              style={on ? { borderColor: seam.color } : undefined}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="size-2" style={{ background: seam.color }} />
                  <span className="text-[0.95rem] font-medium">{district.name}</span>
                </span>
                <span className="num text-[10px] tracking-[0.16em] text-bone-3">{district.code}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-bone-2">{district.lore}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="num text-[10px] tracking-[0.14em]" style={{ color: seam.color }}>
                  SEAM {seam.index} · {gradeLabel(plan.apyBps)}% · {formatLock(plan.lockSeconds).replace(" lock", "")}
                </span>
                <span className="num text-[10px] tracking-[0.14em] text-bone-3">
                  {taken}/{sites.length} PEGGED
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-7 border-t border-[var(--rule)] pt-5">
        <p className="tag">Register</p>
        <div className="mt-3 space-y-px">
          {claims.slice(0, 5).map((claim) => (
            <Link
              key={claim.id}
              href={`/universe/claim/${claim.id}`}
              className="flex items-center gap-3 p-2.5 transition-colors hover:bg-[var(--slate)]"
            >
              <TokenMark id={claim.token.id} symbol={claim.token.symbol} size={26} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs">{claim.site.name}</span>
                <span className="num block text-[10px] text-bone-3">{claim.site.id}</span>
              </span>
              <span className="num text-[10px] text-bone-2">
                {formatTokenAmount(claim.amount, claim.token.symbol)}
              </span>
            </Link>
          ))}
        </div>
        <Link href="/universe/claims" className="act act-line mt-4 w-full">
          <span>Open the register</span>
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function SiteDossier({
  site,
  claim,
  onClose,
  onPegged,
}: {
  site: Site;
  claim: SerializedClaim | null;
  onClose: () => void;
  onPegged: () => Promise<void>;
}) {
  const district = getDistrict(site.districtId);
  const seam = districtSeam(site.districtId);
  const plan = districtPlan(site.districtId);

  const [assetId, setAssetId] = useState(TOKENS[0].id);
  const [amountInput, setAmountInput] = useState(String(defaultAmount(TOKENS[0].id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [site.id]);

  const token = TOKENS.find((item) => item.id === assetId) ?? TOKENS[0];
  const amount = Number(amountInput);
  const usd = Number.isFinite(amount) && amount > 0 ? principalUsd(amount, token.priceUsd) : 0;
  const inRange = usd >= plan.minUsd && usd <= plan.maxUsd;

  async function peg() {
    if (!inRange) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/universe/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, assetId: token.id, amount }),
      });
      const data = (await res.json()) as { error?: string; claim?: SerializedClaim };
      if (!res.ok || !data.claim) throw new Error(data.error ?? "Peg failed.");
      await onPegged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Peg failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--rule)] bg-[#0b0b0c] p-5">
        <div className="min-w-0">
          <p className="tag" style={{ color: seam.color }}>
            {district.name} · {site.id}
          </p>
          <h2 className="display mt-2 truncate text-2xl">{site.name}</h2>
          <p className="num mt-1.5 text-[11px] text-bone-3">{coordLabel(site.x, site.y)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center border border-[var(--rule)] text-bone-3 transition-colors hover:border-bone-3 hover:text-bone"
          aria-label="Close site"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-px bg-[var(--rule)]">
          <Cell label="Elevation" value={`${site.metres} m`} />
          <Cell label="Area" value={`${site.hectares} ha`} />
          <Cell label="Sample grade" value={`${gradeLabel(site.assayBps)} g/t`} accent={seam.color} />
          <Cell label="Feature" value={site.feature} />
        </div>

        <div className="mt-5">
          <p className="tag">Seam {seam.index}</p>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="display text-2xl" style={{ color: seam.color }}>
              {seam.name}
            </span>
            <span className="num text-[11px] text-bone-3">{seam.depth}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-bone-2">{seam.matrix} · {district.ground}</p>
          <div className="mt-4">
            <Row label="Booked coupon" value={`${gradeLabel(plan.apyBps)}%`} accent={seam.color} />
            <Row label="Term" value={formatLock(plan.lockSeconds).replace(" lock", "")} />
            <Row label="Stake range" value={`${formatUsd(plan.minUsd, 0)}–${formatUsd(plan.maxUsd, 0)}`} />
          </div>
        </div>

        {claim ? (
          <div className="mt-6 border border-[var(--rule)] p-4">
            <p className="tag">Pegged</p>
            <div className="mt-3 flex items-center gap-3">
              <TokenMark id={claim.token.id} symbol={claim.token.symbol} size={34} />
              <div className="min-w-0">
                <p className="num text-sm">{formatTokenAmount(claim.amount, claim.token.symbol)}</p>
                <p className="num text-[10px] text-bone-3">held by {claim.holder}</p>
              </div>
            </div>
            <Link href={`/universe/claim/${claim.id}`} className="act act-line mt-4 w-full">
              <span>Open the plate</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <p className="tag">Peg with</p>
            <div className="mt-2.5 grid grid-cols-4 gap-px bg-[var(--rule)]">
              {TOKENS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setAssetId(item.id);
                    setAmountInput(String(defaultAmount(item.id)));
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 bg-[#0b0b0c] py-3 transition-colors",
                    assetId === item.id ? "bg-[var(--slate)]" : "hover:bg-[var(--slate)]",
                  )}
                >
                  <TokenMark id={item.id} symbol={item.symbol} size={24} />
                  <span className="num text-[9px] tracking-[0.1em]">{item.symbol}</span>
                </button>
              ))}
            </div>

            <label className="field mt-4">
              <span>Stake in {token.symbol}</span>
              <input inputMode="decimal" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
            </label>
            <p className={cn("num mt-2 text-[10px]", inRange ? "text-bone-3" : "text-ember")}>
              ≈ {formatUsd(usd)} · range {formatUsd(plan.minUsd, 0)}–{formatUsd(plan.maxUsd, 0)}
            </p>

            {error ? <p className="num mt-3 text-[11px] text-ember">{error}</p> : null}

            <button type="button" className="act act-solid mt-4 w-full" disabled={!inRange || busy} onClick={() => void peg()}>
              <span>{busy ? "Pegging…" : "Peg this site"}</span>
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-bone-3">
              The field is a prototype register. Pegging here reserves ground on the sheet; it does not mint a vault
              position yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-[#0b0b0c] p-3">
      <p className="tag">{label}</p>
      <p className="num mt-1.5 text-sm" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}
