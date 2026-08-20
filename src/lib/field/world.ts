import { PLANS } from "@/lib/dummy";
import { seamOf } from "@/lib/seams";
import { elevation, FIELD, metresAt } from "@/lib/field/terrain";
import type { CategoryId } from "@/lib/field/types";
import type { Plan } from "@/lib/types";

export type DistrictId = "verglas" | "cinder" | "grieve" | "marrow" | "halcyon" | "ochre";

export type District = {
  id: DistrictId;
  code: string;
  name: string;
  /** Plan slug this ground is booked against. */
  planId: string;
  /** Yield category this district is surveyed against. */
  category: CategoryId;
  x: number;
  y: number;
  /** Pull radius — bigger districts win ground further out. */
  reach: number;
  ground: string;
  lore: string;
};

/**
 * Six districts, laid out so the cold high ground sits north and the worked
 * flats sit south. Ground type decides the seam: loose alluvium is a month,
 * reef is a quarter, hot rock is half a year.
 */
export const DISTRICTS: District[] = [
  {
    id: "verglas",
    code: "VG",
    name: "Verglas Shelf",
    planId: "apex",
    category: "staking",
    x: 545,
    y: 205,
    reach: 1.0,
    ground: "Ice-cut gneiss",
    lore: "A frozen bench above the tree line. Crews work it in short shifts and the shafts stay open half a year because nothing thaws fast enough to hurry.",
  },
  {
    id: "cinder",
    code: "CR",
    name: "Cinder Reach",
    planId: "apex",
    category: "rwa",
    x: 1215,
    y: 295,
    reach: 0.98,
    ground: "Basalt, ash bed",
    lore: "Old volcanic ground on the northeast arm. Hot rock, heavy assay, and a long climb back to daylight.",
  },
  {
    id: "grieve",
    code: "GV",
    name: "The Grieve",
    planId: "horizon",
    category: "fixed",
    x: 820,
    y: 505,
    reach: 1.05,
    ground: "Quartz reef in schist",
    lore: "The spine of the field and the reason anyone came here. Most of the register is booked against this reef.",
  },
  {
    id: "marrow",
    code: "MW",
    name: "Marrow Basin",
    planId: "horizon",
    category: "vaults",
    x: 1175,
    y: 705,
    reach: 0.96,
    ground: "Folded shale",
    lore: "A closed basin east of the reef where the rock folds back on itself. Steady ground, steady grade, no surprises either way.",
  },
  {
    id: "halcyon",
    code: "HD",
    name: "Halcyon Delta",
    planId: "pulse",
    category: "lending",
    x: 335,
    y: 630,
    reach: 1.14,
    ground: "River gravel",
    lore: "Where the west drainage lets go of everything it was carrying. Shallow, quick, and worked out and refilled every season.",
  },
  {
    id: "ochre",
    code: "OF",
    name: "Ochre Flats",
    planId: "pulse",
    category: "dex",
    x: 700,
    y: 800,
    reach: 1.13,
    ground: "Iron pan, hardcap",
    lore: "Dry southern flats stained red to the horizon. Nothing down there is deep, which is exactly why people start here.",
  },
];

export function getDistrict(id: DistrictId) {
  const district = DISTRICTS.find((d) => d.id === id);
  if (!district) throw new Error(`Unknown district: ${id}`);
  return district;
}

export function districtPlan(id: DistrictId): Plan {
  const district = getDistrict(id);
  return PLANS.find((plan) => plan.id === district.planId) ?? PLANS[1];
}

export function districtSeam(id: DistrictId) {
  return seamOf(getDistrict(id).planId);
}

function wobble(x: number, y: number, salt: number) {
  const s = Math.sin(x * 0.0091 + salt * 5.13) * Math.cos(y * 0.0107 - salt * 3.71);
  const t = Math.sin((x + y) * 0.0043 + salt * 2.2);
  return s * 0.5 + t * 0.5;
}

/** Distance to a district's centre, roughened so borders are never arcs. */
export function districtScore(x: number, y: number, i: number) {
  const d = DISTRICTS[i];
  return (Math.hypot(x - d.x, y - d.y) / d.reach) * (1 + wobble(x, y, i + 1) * 0.3);
}

export function districtAt(x: number, y: number): DistrictId {
  let best = 0;
  let bestScore = Infinity;
  for (let i = 0; i < DISTRICTS.length; i++) {
    const score = districtScore(x, y, i);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return DISTRICTS[best].id;
}

/**
 * Signed ownership fields, one per district: positive inside, negative out.
 * Contouring each at zero gives the boundary as a smooth line rather than a
 * staircase of cells.
 */
export function districtFields(w: number, h: number) {
  const sx = FIELD.width / (w - 1);
  const sy = FIELD.height / (h - 1);
  const fields = DISTRICTS.map(() => new Float32Array(w * h));
  const scores = new Float32Array(DISTRICTS.length);

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = i * sx;
      const y = j * sy;
      for (let k = 0; k < DISTRICTS.length; k++) scores[k] = districtScore(x, y, k);
      for (let k = 0; k < DISTRICTS.length; k++) {
        let other = Infinity;
        for (let m = 0; m < DISTRICTS.length; m++) if (m !== k && scores[m] < other) other = scores[m];
        fields[k][j * w + i] = other - scores[k];
      }
    }
  }

  return DISTRICTS.map((district, k) => ({
    district,
    grid: { w, h, data: fields[k], sx, sy },
  }));
}

/* ---------------------------------------------------------------- */
/* Sites                                                             */
/* ---------------------------------------------------------------- */

export type Site = {
  id: string;
  name: string;
  x: number;
  y: number;
  districtId: DistrictId;
  /** Metres above datum. */
  metres: number;
  /** Hectares of ground the claim covers. */
  hectares: number;
  /** Sample grade from the survey, in basis points. Flavour, not the coupon. */
  assayBps: number;
  /** Rock or feature the pin sits on. */
  feature: string;
};

const HEADS = [
  "Ash", "Bell", "Black", "Cold", "Copper", "Dun", "Fen", "Gale", "Grim", "Hale",
  "Iron", "Kell", "Loam", "Marl", "Ochre", "Pike", "Quill", "Rime", "Salt", "Slate",
  "Tarn", "Vane", "Wolf", "Yarrow", "Zinc", "Bramble", "Cinder", "Drift", "Ember",
  "Flint", "Harrow", "Ink", "Knap", "Larch", "Mire", "Nettle", "Pitch", "Reed",
  "Sable", "Thorn", "Vellum", "Widow",
];

const TAILS = [
  "Ridge", "Hollow", "Pan", "Bluff", "Sink", "Cut", "Draw", "Spur", "Vein", "Fold",
  "Chimney", "Gully", "Stack", "Reach", "Bench", "Scarp", "Moor", "Head", "Deep",
  "Wash", "Crag", "Shelf", "Bar", "Gate", "Spine", "Rise", "Seam", "Notch",
];

const FEATURES = [
  "Outcrop", "Adit mouth", "Talus fan", "Fault trace", "Gossan cap", "Terrace",
  "Dyke swarm", "Boxwork", "Shear zone", "Placer bar", "Breccia pipe", "Saddle",
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sites are placed once, deterministically: dropped at random, rejected if
 * they land in water or too close to a neighbour. The result reads as a real
 * survey — clustered where the ground is good, empty where it is not.
 */
function buildSites(): Site[] {
  const rand = rng(0x5eed17);
  const sites: Site[] = [];
  const minGap = 74;
  const used = new Set<string>();
  const perDistrict = new Map<DistrictId, number>();

  for (let attempt = 0; attempt < 9000 && sites.length < 86; attempt++) {
    const x = 60 + rand() * (FIELD.width - 120);
    const y = 60 + rand() * (FIELD.height - 120);
    const e = elevation(x, y);
    if (e < FIELD.sea + 0.055) continue;
    if (sites.some((s) => Math.hypot(s.x - x, s.y - y) < minGap)) continue;

    const districtId = districtAt(x, y);
    const district = getDistrict(districtId);
    const n = (perDistrict.get(districtId) ?? 0) + 1;
    perDistrict.set(districtId, n);

    let name = "";
    for (let tries = 0; tries < 40; tries++) {
      const candidate = `${HEADS[Math.floor(rand() * HEADS.length)]} ${TAILS[Math.floor(rand() * TAILS.length)]}`;
      if (!used.has(candidate)) {
        name = candidate;
        used.add(candidate);
        break;
      }
    }
    if (!name) continue;

    // Higher, rougher ground assays better — it is also the ground that is
    // booked to the deep seams, which keeps the map internally consistent.
    const relief = Math.max(0, e - FIELD.sea) / (1 - FIELD.sea);
    const assayBps = Math.round(120 + relief * 900 + rand() * 260);

    sites.push({
      id: `${district.code}-${String(n).padStart(2, "0")}`,
      name,
      x: Math.round(x),
      y: Math.round(y),
      districtId,
      metres: metresAt(x, y),
      hectares: Math.round(28 + rand() * 340),
      assayBps,
      feature: FEATURES[Math.floor(rand() * FEATURES.length)],
    });
  }

  return sites.sort((a, b) => a.id.localeCompare(b.id));
}

export const SITES: Site[] = buildSites();
export const SITE_MAP = new Map(SITES.map((site) => [site.id, site]));

export function getSite(id: string) {
  return SITE_MAP.get(id) ?? null;
}

export function sitesIn(districtId: DistrictId) {
  return SITES.filter((site) => site.districtId === districtId);
}

/** Human-readable position, the way the sheet prints it. */
export function coordLabel(x: number, y: number) {
  const lat = (58.4 - (y / FIELD.height) * 6.2).toFixed(3);
  const lon = (118.9 - (x / FIELD.width) * 9.4).toFixed(3);
  return `${lat}°N ${lon}°W`;
}
