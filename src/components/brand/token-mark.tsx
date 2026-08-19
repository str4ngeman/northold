import { cn } from "@/lib/utils";

const MARKS: Record<string, { tint: string; glyph: string }> = {
  usdt: { tint: "#3FB58C", glyph: "₮" },
  usdc: { tint: "#4C8FE0", glyph: "$" },
  weth: { tint: "#8C9BF0", glyph: "Ξ" },
  wbtc: { tint: "#F2A03D", glyph: "₿" },
};

/**
 * Assets are stamped, not badged: a hairline square in the asset's tint with
 * the glyph cut out of it. No gradients, no circles.
 */
export function TokenMark({
  id,
  color,
  symbol,
  size = 36,
  className,
}: {
  id: string;
  color?: string;
  symbol: string;
  size?: number;
  className?: string;
}) {
  const mark = MARKS[id] ?? { tint: color || "#C9F227", glyph: symbol.slice(0, 1) };

  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center font-medium", className)}
      style={{
        width: size,
        height: size,
        color: mark.tint,
        border: `1px solid ${mark.tint}`,
        background: `color-mix(in oklab, ${mark.tint} 12%, transparent)`,
        fontSize: size * 0.44,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {id === "weth" ? (
        <svg width={size * 0.44} height={size * 0.44} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0.6 L3.2 8.1 L8 10.6 L12.8 8.1 Z" />
          <path d="M8 11.2 L3.2 8.7 L8 15.4 L12.8 8.7 Z" opacity="0.7" />
        </svg>
      ) : (
        mark.glyph
      )}
    </span>
  );
}
