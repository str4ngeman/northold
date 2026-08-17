/** Stadium/rail path. cap: 'left' | 'right' | 'both' */
export function railPath({
  w,
  h,
  cap = "left",
  inset = 0.5,
}: {
  w: number;
  h: number;
  cap?: "left" | "right" | "both";
  inset?: number;
}) {
  const r = h / 2 - inset;
  const y0 = inset;
  const y1 = h - inset;
  const x0 = inset;
  const x1 = w - inset;
  if (cap === "left") {
    return `M ${x1} ${y1} H ${x0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} H ${x1}`;
  }
  if (cap === "right") {
    return `M ${x0} ${y0} H ${x1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} H ${x0}`;
  }
  return `M ${x0 + r} ${y0} H ${x1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} H ${x0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`;
}

export function tunnelPaths({
  w = 1250,
  h = 765,
  lines = 6,
  curve = 0.62,
}: {
  w?: number;
  h?: number;
  lines?: number;
  curve?: number;
} = {}) {
  const vx = w / 2;
  const paths: string[] = [];
  for (let i = 0; i < lines; i++) {
    const t = lines === 1 ? 0 : i / (lines - 1);
    const startX = t * (vx * 0.86);
    const cx = vx - (vx - startX) * (1 - curve);
    const cy = h * (0.28 + t * 0.22);
    paths.push(
      `M ${startX.toFixed(1)} 1 C ${cx.toFixed(1)} ${cy.toFixed(1)} ${vx} ${(h * 0.55).toFixed(1)} ${vx} ${h}`,
    );
  }
  return { paths, viewBox: `0 0 ${w} ${h}`, w, h, vx };
}
