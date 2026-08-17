"use client";

import { useId } from "react";

import { tunnelPaths } from "@/kinetic/geometry";

export function TunnelLines({
  lines = 6,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const { paths, viewBox, w, h, vx } = tunnelPaths({ lines });

  return (
    <svg className={`tunnel ${className}`.trim()} viewBox={viewBox} fill="none" aria-hidden="true">
      <defs>
        {paths.map((_, i) => (
          <linearGradient
            key={i}
            id={`${uid}-g${i}`}
            data-travel=""
            gradientUnits="objectBoundingBox"
            x1="0"
            y1="0"
            x2="5%"
            y2="5%"
          >
            <stop stopColor="var(--light)" stopOpacity="0" />
            <stop offset=".5" stopColor="var(--light)" />
            <stop offset="1" stopColor="var(--light)" stopOpacity="0" />
          </linearGradient>
        ))}
        <g id={`${uid}-half`}>
          {paths.map((d, i) => (
            <path key={`r${i}`} d={d} stroke="var(--line)" strokeWidth="1" />
          ))}
          {paths.map((d, i) => (
            <path key={`t${i}`} d={d} stroke={`url(#${uid}-g${i})`} strokeWidth="1.4" />
          ))}
        </g>
      </defs>
      <path d={`M ${vx} 0 V ${h}`} stroke="var(--line)" strokeWidth="1" />
      <use href={`#${uid}-half`} />
      <use href={`#${uid}-half`} transform={`scale(-1,1) translate(${-w},0)`} />
    </svg>
  );
}
