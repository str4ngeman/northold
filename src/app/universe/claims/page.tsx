import Link from "next/link";

import { TokenMark } from "@/components/brand/token-mark";
import { listClaims } from "@/lib/field/store";
import { serializeClaim } from "@/lib/field/serialize";
import { formatLock, formatTokenAmount, formatTokenId } from "@/lib/format";
import { DISTRICTS } from "@/lib/field/world";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const claims = listClaims().map(serializeClaim);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="tag whitespace-nowrap">§ Register</span>
          <span className="h-px flex-1 bg-[var(--rule)]" />
          <span className="tag whitespace-nowrap">
            {claims.length} pegged / {DISTRICTS.length} districts
          </span>
        </div>
        <h1 className="display mt-7 text-[clamp(2.2rem,5vw,3.4rem)]">Every peg on the sheet.</h1>
        <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-bone-2">
          Each entry is one site, one asset, and one survey plate drawn from the ground it sits on. Plates are generated
          from the field&apos;s elevation model, not stored — the contours on a plate are the contours on the map.
        </p>

        <div className="mt-12 grid gap-px bg-[var(--rule)] sm:grid-cols-2 xl:grid-cols-3">
          {claims.map((claim) => (
            <Link
              key={claim.id}
              href={`/universe/claim/${claim.id}`}
              className="group block bg-[#0b0b0c] p-3 transition-colors hover:bg-[var(--slate)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/universe/nft/${claim.id}/image`}
                alt={`Survey plate for ${claim.site.name}`}
                className="aspect-square w-full border border-[var(--rule)] bg-[#060607]"
                loading="lazy"
              />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{claim.site.name}</p>
                  <p className="num mt-1 text-[10px] text-bone-3">
                    {claim.site.id} · {claim.district.name}
                  </p>
                </div>
                <TokenMark id={claim.token.id} symbol={claim.token.symbol} size={30} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--rule)] pt-2.5">
                <span className="num text-[10px]" style={{ color: claim.seam.color }}>
                  {claim.seam.index} · {formatLock(claim.plan.lockSeconds).replace(" lock", "")}
                </span>
                <span className="num text-[10px] text-bone-2">
                  {formatTokenAmount(claim.amount, claim.token.symbol)}
                </span>
                <span className="num text-[10px] text-bone-3">{formatTokenId(claim.id)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
