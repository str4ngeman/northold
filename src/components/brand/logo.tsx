"use client";

import Link from "next/link";

import { StrataMark } from "@/components/brand/mark";
import { useEaster } from "@/components/easter-eggs";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Logo({ className, markOnly }: { className?: string; markOnly?: boolean }) {
  const { tapLogo } = useEaster();

  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5 text-bone", className)}
      onClick={tapLogo}
    >
      <StrataMark size={19} className="transition-colors duration-300 group-hover:text-flux" />
      {!markOnly && (
        <span className="num text-[0.78rem] font-medium uppercase tracking-[0.28em]">{BRAND.name}</span>
      )}
    </Link>
  );
}
