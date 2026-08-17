"use client";

import type { CSSProperties, ReactNode } from "react";

export function Marquee({
  speed = 28,
  reverse = false,
  children,
}: {
  speed?: number;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`marquee${reverse ? " marquee--reverse" : ""}`}
      style={{ "--speed": `${speed}s` } as CSSProperties}
      data-marquee-speed={speed}
      aria-hidden="true"
    >
      <div className="marquee__content">
        <div className="marquee__set">{children}</div>
        <div className="marquee__set">{children}</div>
      </div>
    </div>
  );
}
