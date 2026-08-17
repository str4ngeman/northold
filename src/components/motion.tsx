"use client";

import { animate } from "motion";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
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

export function ProgressRing({
  value,
  size = 72,
  color = "var(--gain)",
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));

  return (
    <svg width={size} height={size} viewBox="0 0 72 72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
      <motion.circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - pct) }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

export function ConfettiBurst({ fire }: { fire: boolean }) {
  if (!fire) return null;
  const bits = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {bits.map((i) => {
        const angle = (i / bits.length) * Math.PI * 2;
        const dist = 140 + (i % 6) * 24;
        return (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 size-2 rounded-full"
            style={{ background: i % 3 === 0 ? "#d9b56a" : i % 3 === 1 ? "#5ec4b6" : "#eef3f7" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}
