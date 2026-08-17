import { cn } from "@/lib/utils";

export function CompassMark({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.6 L14.15 12 L12 10.7 L9.85 12 Z" fill="currentColor" />
      <path d="M12 20.4 L9.85 12 L12 13.3 L14.15 12 Z" fill="currentColor" opacity="0.38" />
      <circle cx="12" cy="12" r="1.55" fill="currentColor" />
    </svg>
  );
}
