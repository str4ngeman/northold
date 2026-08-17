export const BRAND = {
  name: "Northold",
  domain: "northold.app",
  tagline: "Hold north. Collect USDT.",
  title: "Northold — Hold north. Collect USDT.",
  description:
    "Lock ERC-20 tokens on a bearing. Yield is paid in USDT and never compounds unless you lock again. Principal returns in the same asset.",
  siwePrefix: "Northold wants you to sign in.",
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
