"use client";

import { railPath } from "@/kinetic/geometry";

export function StrokeFrame({
  w = 800,
  h = 240,
  cap = "left",
  className = "",
  draw = true,
}: {
  w?: number;
  h?: number;
  cap?: "left" | "right" | "both";
  className?: string;
  draw?: boolean;
}) {
  const d = railPath({ w, h, cap });

  return (
    <svg
      className={`frame ${className}`.trim()}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={d}
        data-path={draw ? "" : undefined}
        pathLength={1}
        stroke="var(--line-strong)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        style={draw ? undefined : { strokeDashoffset: 0 }}
      />
    </svg>
  );
}
