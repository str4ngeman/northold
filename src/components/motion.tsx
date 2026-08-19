"use client";

import { animate } from "motion";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

import { SEAMS } from "@/lib/seams";
import { cn } from "@/lib/utils";

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, clipPath: "inset(0 100% 0 0)" }}
      animate={{ opacity: 1, y: 0, clipPath: "inset(0 0% 0 0)" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const ctrl = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setN,
    });
    return () => ctrl.stop();
  }, [value]);

  return <span className={cn("num", className)}>{format ? format(n) : n.toFixed(2)}</span>;
}

/** Square gauge — a dial would be out of place on this sheet. */
export function ProgressRing({
  value,
  size = 72,
  color = "var(--flux)",
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  const pct = Math.min(1, Math.max(0, value));
  const per = 68 * 4;

  return (
    <svg width={size} height={size} viewBox="0 0 72 72">
      <rect x="2" y="2" width="68" height="68" fill="none" stroke="rgba(237,231,220,.1)" strokeWidth="4" />
      <motion.rect
        x="2"
        y="2"
        width="68"
        height="68"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={per}
        initial={{ strokeDashoffset: per }}
        animate={{ strokeDashoffset: per * (1 - pct) }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

/** Chips of ore thrown off a strike. */
export function ConfettiBurst({ fire }: { fire: boolean }) {
  if (!fire) return null;
  const bits = Array.from({ length: 30 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {bits.map((i) => {
        const angle = (i / bits.length) * Math.PI * 2;
        const dist = 150 + (i % 6) * 26;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 size-1.5"
            style={{ background: SEAMS[i % 3].color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, rotate: 180 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}
