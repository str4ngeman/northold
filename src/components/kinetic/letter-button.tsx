"use client";

import Link from "next/link";

type LetterButtonProps = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "solid" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  welcome?: string;
};

function Letters({ label, stagger = 7 }: { label: string; stagger?: number }) {
  const chars = [...label];
  return (
    <>
      <span className="btn__row btn__row--top">
        {chars.map((c, i) => (
          <span key={`t${i}`} className="btn__l" style={{ transitionDelay: `${i * stagger}ms` }}>
            {c === " " ? "\u00A0" : c}
          </span>
        ))}
      </span>
      <span className="btn__row btn__row--bottom">
        {chars.map((c, i) => (
          <span key={`b${i}`} className="btn__l" style={{ transitionDelay: `${i * stagger}ms` }}>
            {c === " " ? "\u00A0" : c}
          </span>
        ))}
      </span>
    </>
  );
}

export function LetterButton({
  label,
  href,
  onClick,
  variant = "solid",
  disabled,
  type = "button",
  className = "",
  welcome,
}: LetterButtonProps) {
  const cls = `btn btn--${variant} ${className}`.trim();
  const inner = (
    <>
      <span className="btn__text" aria-hidden="true">
        <Letters label={label} />
      </span>
      <span className="btn__fill" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cls}
        data-magnetic
        data-hover="true"
        data-welcome={welcome}
        onClick={onClick}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={cls}
      data-magnetic
      data-hover="true"
      data-welcome={welcome}
      onClick={onClick}
      disabled={disabled}
    >
      {inner}
    </button>
  );
}
