import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Hint({
  text,
  children,
  className,
}: {
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex items-center gap-1 group/hint", className)}>
      {children}
      <Info className="size-3.5 text-[var(--ink-3)]" />
      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-56 -translate-x-1/2 rounded-2xl bg-[#151b26] px-3 py-2 text-left text-xs leading-relaxed text-[var(--ink)] opacity-0 shadow-xl ring-1 ring-white/10 transition-opacity group-hover/hint:opacity-100">
        {text}
      </span>
    </span>
  );
}
