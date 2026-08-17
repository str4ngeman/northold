"use client";

import { useId, type CSSProperties, type ReactNode } from "react";

export function CircleText({
  text,
  duration = 22,
  children,
}: {
  text: string;
  duration?: number;
  children?: ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const loop = `${text} · `;

  return (
    <div className="badge" data-welcome="circle">
      <svg
        className="badge__ring"
        viewBox="0 0 170 170"
        style={{ "--dur": `${duration}s` } as CSSProperties}
        data-no-pause
        aria-hidden="true"
      >
        <defs>
          <path id={id} d="M 85 15 a 70 70 0 1 1 -0.01 0 Z" />
        </defs>
        <text fontSize="11" letterSpacing="0.18em" fill="var(--ink-3)">
          <textPath href={`#${id}`}>{loop}</textPath>
          <textPath href={`#${id}`} startOffset="50%">
            {loop}
          </textPath>
        </text>
      </svg>
      <div className="badge__center">{children}</div>
    </div>
  );
}
