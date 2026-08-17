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
        "rounded-[1.75rem] bg-[var(--bg-raise)]/85 ring-1 ring-white/8 backdrop-blur-xl shadow-[0_24px_60px_-28px_rgba(0,0,0,.75)]",
        hover && "transition-transform duration-300 hover:-translate-y-1 hover:ring-white/14",
        className,
      )}
    >
      {children}
    </div>
  );
}
