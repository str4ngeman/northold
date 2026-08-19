"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown } from "lucide-react";

import { DepthRule } from "@/components/kit";
import { SEAMS } from "@/lib/seams";

export function EmptyVault() {
  const [taps, setTaps] = useState(0);

  return (
    <div className="panel ticked grid items-center gap-10 bg-[#0b0b0c] p-8 sm:grid-cols-[140px_1fr] lg:p-12">
      <button
        type="button"
        className="mx-auto"
        aria-label="Depth scale"
        onClick={() => {
          const next = taps + 1;
          setTaps(next);
          if (next === 4) {
            toast.message("Nothing down there yet. That is the only thing you can fix from here.");
            setTaps(0);
          }
        }}
      >
        <DepthRule height={220} />
      </button>

      <div>
        <p className="tag">Empty ground</p>
        <h2 className="display mt-4 text-3xl">No shafts open.</h2>
        <p className="mt-4 max-w-md text-[0.9rem] leading-relaxed text-bone-2">
          Sink capital into a seam and the coupon starts running the second it mints. You can lift accrued coupon the
          next day if you want to watch the mechanism work before committing further.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          <Link href="/app/stake" className="act act-solid">
            <span>Sink a shaft</span>
            <ArrowDown className="size-3.5" />
          </Link>
          <Link href="/plans" className="act act-line">
            <span>Read the seams</span>
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--rule)] pt-5">
          {SEAMS.map((seam) => (
            <span key={seam.slug} className="num flex items-center gap-2 text-[10px] tracking-[0.12em] text-bone-3">
              <span className="size-1.5" style={{ background: seam.color }} />
              {seam.name.toUpperCase()} · {seam.depth}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
