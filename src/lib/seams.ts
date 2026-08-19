/**
 * A seam is a plan wearing its geology. Plan slugs stay put — the DB and the
 * on-chain plan ids are keyed on them — but everything a person reads comes
 * from here.
 */
export type Seam = {
  slug: string;
  key: "placer" | "lode" | "mantle";
  /** Roman numeral used as the survey index on plates and rules. */
  index: string;
  name: string;
  /** Depth band, purely narrative — it stands in for the term. */
  depth: string;
  /** Metres below datum, used to place the seam on the depth ruler. */
  metres: [number, number];
  color: string;
  /** Rock the seam cuts through. Shown on assay sheets. */
  matrix: string;
  tagline: string;
  note: string;
};

export const SEAMS: Seam[] = [
  {
    slug: "pulse",
    key: "placer",
    index: "I",
    name: "Placer",
    depth: "0 – 120 m",
    metres: [0, 120],
    color: "#BFAE97",
    matrix: "Alluvium, gravel wash",
    tagline: "Loose ground, worked in a month. Shallow, quick, forgiving.",
    note: "Worked from the surface. Nothing here is buried deep enough to be difficult.",
  },
  {
    slug: "horizon",
    key: "lode",
    index: "II",
    name: "Lode",
    depth: "120 – 600 m",
    metres: [120, 600],
    color: "#C9F227",
    matrix: "Quartz reef in schist",
    tagline: "The working seam. A quarter underground for a heavier grade.",
    note: "The working seam. Most of the register sits on this bench.",
  },
  {
    slug: "apex",
    key: "mantle",
    index: "III",
    name: "Mantle",
    depth: "600 – 2 400 m",
    metres: [600, 2400],
    color: "#E4552E",
    matrix: "Ultramafic, hot rock",
    tagline: "Deep rock, half a year down. The richest assay on the sheet.",
    note: "Deep ground. Long shaft, heavy grade, and no quick way back up.",
  },
];

const FALLBACK: Seam = SEAMS[1];

/**
 * Seam names are the naming authority, not the plan rows. A database seeded
 * before this vocabulary existed still reads as Placer / Lode / Mantle.
 */
export function seamOf(planId: string, lockSeconds?: number): Seam {
  const hit = SEAMS.find((seam) => seam.slug === planId);
  if (hit) return hit;
  return lockSeconds == null ? FALLBACK : seamForLock(lockSeconds);
}

/** Seam for an arbitrary term, so admin-authored plans still land somewhere sane. */
export function seamForLock(lockSeconds: number): Seam {
  const days = lockSeconds / 86400;
  if (days <= 45) return SEAMS[0];
  if (days <= 120) return SEAMS[1];
  return SEAMS[2];
}

/** Grade is APY read as an assay: grams per tonne is just basis points in a hat. */
export function gradeLabel(apyBps: number) {
  return `${(apyBps / 100).toFixed(apyBps % 100 === 0 ? 1 : 2)}`;
}
