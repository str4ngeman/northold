import { cn } from "@/lib/utils";

const MARKS: Record<string, { bg: string; glyph: string }> = {
  usdt: { bg: "#26A17B", glyph: "₮" },
  usdc: { bg: "#2775CA", glyph: "$" },
  weth: { bg: "#627EEA", glyph: "Ξ" },
  wbtc: { bg: "#F7931A", glyph: "₿" },
};

export function TokenMark({
  id,
  color,
  symbol,
  size = 40,
  className,
}: {
  id: string;
  color?: string;
  symbol: string;
  size?: number;
  className?: string;
}) {
  const mark = MARKS[id] ?? { bg: color || "#d9b56a", glyph: symbol.slice(0, 1) };

  return (
    <span
      className={cn(
        "inline-grid place-items-center rounded-full font-semibold text-white shadow-[inset_0_-6px_12px_rgba(0,0,0,.25)]",
        className,
      )}
      style={{ width: size, height: size, background: mark.bg, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {id === "weth" ? (
        <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 16 16" fill="white">
          <path d="M8 0.6 L3.2 8.1 L8 10.6 L12.8 8.1 Z" />
          <path d="M8 11.2 L3.2 8.7 L8 15.4 L12.8 8.7 Z" opacity="0.75" />
        </svg>
      ) : (
        mark.glyph
      )}
    </span>
  );
}
