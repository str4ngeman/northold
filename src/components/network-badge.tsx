"use client";

import { useCatalog } from "@/hooks/use-catalog";
import { useLabUi } from "@/hooks/use-lab-ui";
import { cn } from "@/lib/utils";

export function NetworkBadge({ className }: { className?: string }) {
  const catalog = useCatalog();
  const labUi = useLabUi();
  if (!catalog?.network) return null;
  const { mode, shortLabel } = catalog.network;

  const base =
    "num inline-flex items-center gap-2 border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em]";

  if (!labUi) {
    return (
      <span className={cn(base, "border-[var(--rule)] text-bone-3", className)}>
        <span className="size-1.5 bg-current" />
        {shortLabel}
      </span>
    );
  }

  const label = mode === "lab" ? "Local" : mode === "test" ? "Test" : "Live";
  return (
    <span
      className={cn(
        base,
        mode === "live"
          ? "border-ember/50 text-ember"
          : mode === "test"
            ? "border-flux/50 text-flux"
            : "border-[var(--rule)] text-bone-3",
        className,
      )}
    >
      <span className={cn("size-1.5 bg-current", mode === "live" && "seep")} />
      {label} · {shortLabel}
    </span>
  );
}
