export const BRAND = {
  name: "Northold",
  domain: "northold.app",
  tagline: "Capital, held at depth.",
  title: "Northold — capital, held at depth",
  description:
    "Northold assays fixed-term deposits like ore. Sink capital into a seam, watch the grade accrue in the same asset you deposited, and lift it whenever you want. The position is a core sample you own.",
  cookies: {
    session: "northold_session",
    referral: "northold_ref",
  },
  storage: {
    aurora: "northold-aurora",
    hold: "northold-hold",
  },
} as const;

/**
 * Terms are depths. The deeper the seam, the longer the shaft stays open and the
 * richer the grade — the same trade every mine has ever made.
 */
export const DEFAULT_BEARINGS = [
  {
    slug: "pulse",
    name: "Placer",
    tagline: "Loose ground, worked in a month. Shallow, quick, forgiving.",
  },
  {
    slug: "horizon",
    name: "Lode",
    tagline: "The working seam. A quarter underground for a heavier grade.",
  },
  {
    slug: "apex",
    name: "Mantle",
    tagline: "Deep rock, half a year down. The richest assay on the sheet.",
  },
] as const;
