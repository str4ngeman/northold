"use client";

import { useCatalog } from "@/hooks/use-catalog";
import { useLabUi } from "@/hooks/use-lab-ui";
import { cn } from "@/lib/utils";

export function NetworkBadge({ className }: { className?: string }) {
  const catalog = useCatalog();
  const labUi = useLabUi();
  if (!catalog?.network) return null;
  const { mode, shortLabel } = catalog.network;
  if (!labUi) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-white/8 text-[var(--ink-2)]",
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-current" />
        {shortLabel}
      </span>
    );
  }
  const label = mode === "lab" ? "Local" : mode === "test" ? "Test" : "Live";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        mode === "live" ? "bg-[var(--loss)]/15 text-[var(--loss)]" : mode === "test" ? "bg-[var(--light)]/15 text-[var(--light)]" : "bg-white/8 text-[var(--ink-2)]",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label} · {shortLabel}
    </span>
  );
}
