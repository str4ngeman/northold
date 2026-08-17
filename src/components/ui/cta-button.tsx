import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CtaButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
};

const variants = {
  primary:
    "bg-[var(--light)] text-[#16120a] shadow-[0_12px_32px_-12px_rgba(217,181,106,.75)] hover:brightness-110",
  ghost: "bg-white/5 text-[var(--ink)] ring-1 ring-white/10 hover:bg-white/10",
  danger: "bg-[var(--loss)]/15 text-[var(--loss)] ring-1 ring-[var(--loss)]/25 hover:bg-[var(--loss)]/25",
};

export function CtaButton({
  children,
  href,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className,
}: CtaButtonProps) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-sm font-semibold transition-transform duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
