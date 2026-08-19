export const BRAND = {
  name: "Northold",
  domain: "northold.app",
  tagline: "Hold north. Earn the same token.",
  title: "Northold — Hold north. Earn the same token.",
  description:
    "Lock ERC-20 tokens on a bearing. Yield is paid in the same asset you deposit. Principal returns in that token too.",
  cookies: {
    session: "northold_session",
    referral: "northold_ref",
  },
  storage: {
    aurora: "northold-aurora",
    hold: "northold-hold",
  },
} as const;

export const DEFAULT_BEARINGS = [
  {
    slug: "pulse",
    name: "Watch",
    tagline: "Thirty days. A short watch on the north.",
  },
  {
    slug: "horizon",
    name: "Bearing",
    tagline: "Ninety days. The middle course.",
  },
  {
    slug: "apex",
    name: "Meridian",
    tagline: "One hundred eighty days. The long north.",
  },
] as const;
