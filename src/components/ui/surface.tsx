import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Surface({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "panel ticked",
        hover && "transition-colors duration-300 hover:border-bone-3 hover:bg-[var(--slate-2)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
