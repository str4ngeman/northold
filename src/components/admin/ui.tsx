import type { ReactNode } from "react";

import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function AdminPage({
  kicker,
  title,
  description,
  action,
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">{kicker}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-sm text-[var(--ink-2)]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <Surface className="overflow-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </Surface>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--ink-3)]", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3.5 align-middle", className)}>{children}</td>;
}

export function StatusPill({ on, label, warn }: { on: boolean; label?: string; warn?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        warn
          ? "bg-[var(--loss)]/15 text-[var(--loss)]"
          : on
            ? "bg-[var(--gain)]/15 text-[var(--gain)]"
            : "bg-white/8 text-[var(--ink-3)]",
      )}
    >
      {label ?? (on ? "Active" : "Off")}
    </span>
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <span className="text-[11px] text-[var(--ink-3)]">{hint}</span>}
    </label>
  );
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center text-sm text-[var(--ink-3)]">
        {text}
      </td>
    </tr>
  );
}
