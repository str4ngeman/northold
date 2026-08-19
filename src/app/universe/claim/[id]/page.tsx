import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TokenMark } from "@/components/brand/token-mark";
import { serializeClaim } from "@/lib/field/serialize";
import { getClaim } from "@/lib/field/store";
import { formatLock, formatTokenAmount, formatTokenId, formatUsd } from "@/lib/format";
import { gradeLabel } from "@/lib/seams";

export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: PageProps<"/universe/claim/[id]">) {
  const { id } = await params;
  const row = getClaim(Number(id));
  if (!row) notFound();
  const claim = serializeClaim(row);
  const site = claim.site;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <Link
          href="/universe"
          className="num inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-bone-3 transition-colors hover:text-bone"
        >
          <ArrowLeft className="size-3.5" /> Back to the sheet
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/universe/nft/${claim.id}/image`}
              alt={`Survey plate for ${site.name}`}
              className="w-full border border-[var(--rule)] bg-[#060607]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="num text-[10px] tracking-[0.14em] text-bone-3">
                PLATE RENDERED FROM ELEVATION MODEL · {claim.coords}
              </span>
              <a href={`/api/universe/nft/${claim.id}`} className="act act-quiet h-8 px-0">
                <span>Metadata JSON ↗</span>
              </a>
            </div>
          </div>

          <div>
            <p className="tag" style={{ color: claim.seam.color }}>
              {claim.district.name} · {site.id}
            </p>
            <h1 className="display mt-4 text-[clamp(2.2rem,5vw,3.4rem)]">{site.name}</h1>
            <p className="mt-5 text-[0.95rem] leading-relaxed text-bone-2">{claim.district.lore}</p>

            <div className="mt-9 flex items-center gap-4 border-y border-[var(--rule)] py-5">
              <TokenMark id={claim.token.id} symbol={claim.token.symbol} size={44} />
              <div>
                <p className="num text-xl">{formatTokenAmount(claim.amount, claim.token.symbol)}</p>
                <p className="num mt-1 text-[11px] text-bone-3">
                  ≈ {formatUsd(claim.amount * claim.token.priceUsd)} · held by {claim.holder}
                </p>
              </div>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-px bg-[var(--rule)]">
              <Cell label="Seam" value={`${claim.seam.index} · ${claim.seam.name}`} accent={claim.seam.color} />
              <Cell label="Depth band" value={claim.seam.depth} />
              <Cell label="Booked coupon" value={`${gradeLabel(claim.plan.apyBps)}%`} accent={claim.seam.color} />
              <Cell label="Term" value={formatLock(claim.plan.lockSeconds).replace(" lock", "")} />
              <Cell label="Elevation" value={`${site.metres} m`} />
              <Cell label="Area" value={`${site.hectares} ha`} />
              <Cell label="Sample grade" value={`${gradeLabel(site.assayBps)} g/t`} />
              <Cell label="Register" value={formatTokenId(claim.id)} />
            </dl>

            <p className="mt-8 text-[11px] leading-relaxed text-bone-3">
              Ground: {claim.district.ground}. Matrix: {claim.seam.matrix}. Feature at the peg: {site.feature}.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/app/stake" className="act act-solid">
                <span>Sink a shaft</span>
              </Link>
              <Link href="/universe/claims" className="act act-line">
                <span>The register</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-[#0b0b0c] p-4">
      <dt className="tag">{label}</dt>
      <dd className="num mt-2 text-sm" style={accent ? { color: accent } : undefined}>
        {value}
      </dd>
    </div>
  );
}
