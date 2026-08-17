"use client";

import Link from "next/link";

import { CompassMark } from "@/components/brand/mark";
import { useEaster } from "@/components/easter-eggs";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Logo({ className, markOnly }: { className?: string; markOnly?: boolean }) {
  const { tapLogo } = useEaster();

  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)} onClick={tapLogo}>
      <span className="relative grid size-9 place-items-center rounded-2xl bg-[var(--light)] text-[#16120a] shadow-[0_8px_20px_-8px_rgba(217,181,106,.8)]">
        <CompassMark size={18} />
      </span>
      {!markOnly && (
        <span className="text-[15px] font-semibold tracking-tight">
          {BRAND.name}
        </span>
      )}
    </Link>
  );
}
