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
  primary: "act-solid",
  ghost: "act-line",
  danger: "act-warn",
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
  const cls = cn("act", variants[variant], className);

  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      <span>{children}</span>
    </button>
  );
}
