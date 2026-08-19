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
    <span className={cn("group/hint relative inline-flex items-center gap-1.5", className)}>
      {children}
      <Info className="size-3 text-bone-3" />
      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-60 -translate-x-1/2 border border-[var(--rule)] bg-[var(--slate-2)] px-3 py-2 text-left text-xs leading-relaxed text-bone opacity-0 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] transition-opacity group-hover/hint:opacity-100">
        {text}
      </span>
    </span>
  );
}
