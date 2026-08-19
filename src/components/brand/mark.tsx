import { cn } from "@/lib/utils";

/**
 * The strata mark: one square core, cut into three seams. The deepest band is
 * solid because that is the one you have to commit to.
 */
export function StrataMark({
  className,
  size = 18,
  colored,
}: {
  className?: string;
  size?: number;
  colored?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect x="2.6" y="2.6" width="18.8" height="18.8" stroke="currentColor" strokeWidth="1.6" />
      {colored ? (
        <>
          <rect x="3.4" y="3.4" width="17.2" height="5.2" fill="#BFAE97" opacity="0.55" />
          <rect x="3.4" y="9.4" width="17.2" height="5.2" fill="#C9F227" opacity="0.75" />
          <rect x="3.4" y="15.4" width="17.2" height="5.2" fill="#E4552E" />
        </>
      ) : (
        <rect x="3.4" y="15.4" width="17.2" height="5.2" fill="currentColor" />
      )}
      <path d="M2.6 9h18.8M2.6 15h18.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
