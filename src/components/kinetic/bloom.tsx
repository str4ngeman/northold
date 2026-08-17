import type { HTMLAttributes } from "react";

export function Bloom({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bloom ${className}`.trim()} aria-hidden="true" {...props} />;
}
