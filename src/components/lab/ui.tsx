"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function LabPage({
  kicker,
  title,
  body,
  children,
}: {
  kicker: string;
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">{kicker}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      {body ? <p className="mt-2 max-w-xl text-sm text-[var(--ink-2)]">{body}</p> : null}
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function LabStat({
  label,
  value,
  hint,
  live,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  live?: boolean;
}) {
  return (
    <Surface className="p-5">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--ink-3)]">
        {live ? <span className="size-1.5 rounded-full bg-[var(--gain)]" /> : null}
        {label}
      </p>
      <p className="num mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--ink-3)]">{hint}</p> : null}
    </Surface>
  );
}

export function LogPane({ lines, running }: { lines: string[]; running?: boolean }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <pre
      ref={ref}
      className="max-h-[420px] min-h-40 overflow-auto rounded-[1.35rem] bg-[var(--bg-sink)] p-4 font-mono text-[12px] leading-5 text-[var(--ink-2)] ring-1 ring-white/6"
    >
      {lines.length === 0
        ? running
          ? "running…"
          : "Output lands here."
        : lines.join("\n")}
      {running ? <span className="ml-1 animate-pulse text-[var(--light)]">▍</span> : null}
    </pre>
  );
}

export function StatusDot({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm",
        on ? "text-[var(--gain)]" : "text-[var(--ink-3)]",
      )}
    >
      <span className={cn("size-2 rounded-full", on ? "bg-[var(--gain)]" : "bg-white/20")} />
      {on ? "Live" : "Off"}
    </span>
  );
}

export function GuardRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-3 last:border-0">
      <span className="text-sm">{label}</span>
      <span className={ok ? "text-[var(--gain)]" : "text-[var(--loss)]"}>{ok ? "yes" : "missing"}</span>
    </div>
  );
}
