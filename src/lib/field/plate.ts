import type { FieldClaim } from "@/lib/field/claims";
import { contour, patch } from "@/lib/field/terrain";
import { coordLabel, getDistrict, getSite } from "@/lib/field/world";
import { formatTokenAmount, formatTokenId } from "@/lib/format";
import { seamOf } from "@/lib/seams";
import { districtPlan } from "@/lib/field/world";
import type { Token } from "@/lib/types";

const SIZE = 720;
const MAP = { x: 56, y: 132, w: 608, h: 424 };
/** World units covered by the plate. Tight enough that landforms read. */
const SPAN = 300;

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * A claim's plate is a survey sheet: the real contours of the ground it sits
 * on, cut from the same elevation model the map uses, with the register line
 * printed underneath.
 */
export function claimPlateSvg(claim: Pick<FieldClaim, "id" | "siteId" | "amount">, token?: Token) {
  const site = getSite(claim.siteId);
  if (!site) return fallback();

  const district = getDistrict(site.districtId);
  const seam = seamOf(districtPlan(site.districtId).id);

  const res = 68;
  const grid = patch(site.x, site.y, SPAN, res);

  let lo = Infinity;
  let hi = -Infinity;
  for (const v of grid.data) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }

  const levels = 11;
  const toX = (wx: number) => MAP.x + (wx / SPAN) * MAP.w;
  const toY = (wy: number) => MAP.y + (wy / SPAN) * MAP.h;

  const lines: string[] = [];
  for (let i = 1; i < levels; i++) {
    const level = lo + ((hi - lo) * i) / levels;
    const segs = contour(grid, level);
    if (!segs.length) continue;
    const d = segs
      .map(([x1, y1, x2, y2]) => `M${toX(x1).toFixed(1)} ${toY(y1).toFixed(1)}L${toX(x2).toFixed(1)} ${toY(y2).toFixed(1)}`)
      .join("");
    const index = i / levels;
    const major = i % 3 === 0;
    lines.push(
      `<path d="${d}" fill="none" stroke="${major ? seam.color : "#EDE7DC"}" stroke-opacity="${(0.16 + index * 0.5).toFixed(2)}" stroke-width="${major ? 1.5 : 0.75}"/>`,
    );
  }

  const cx = toX(SPAN / 2);
  const cy = toY(SPAN / 2);
  const amount = token ? formatTokenAmount(claim.amount, token.symbol) : String(claim.amount);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
  <defs>
    <clipPath id="frame"><rect x="${MAP.x}" y="${MAP.y}" width="${MAP.w}" height="${MAP.h}"/></clipPath>
    <pattern id="grat" width="38" height="38" patternUnits="userSpaceOnUse">
      <path d="M38 0H0V38" fill="none" stroke="#EDE7DC" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="#0B0B0C"/>

  <!-- header -->
  <text x="56" y="60" fill="#EDE7DC" fill-opacity="0.34" font-size="11" letter-spacing="4.5">NORTHOLD FIELD SURVEY</text>
  <text x="${SIZE - 56}" y="60" text-anchor="end" fill="${seam.color}" font-size="11" letter-spacing="4.5">SEAM ${esc(seam.index)} · ${esc(seam.name.toUpperCase())}</text>
  <text x="56" y="100" fill="#EDE7DC" font-size="27" letter-spacing="-0.4">${esc(site.name)}</text>
  <line x1="56" y1="116" x2="${SIZE - 56}" y2="116" stroke="#EDE7DC" stroke-opacity="0.14"/>

  <!-- ground -->
  <rect x="${MAP.x}" y="${MAP.y}" width="${MAP.w}" height="${MAP.h}" fill="#060607"/>
  <rect x="${MAP.x}" y="${MAP.y}" width="${MAP.w}" height="${MAP.h}" fill="url(#grat)"/>
  <g clip-path="url(#frame)">${lines.join("")}</g>
  <rect x="${MAP.x}" y="${MAP.y}" width="${MAP.w}" height="${MAP.h}" fill="none" stroke="#EDE7DC" stroke-opacity="0.2"/>

  <!-- peg -->
  <line x1="${cx - 22}" y1="${cy}" x2="${cx + 22}" y2="${cy}" stroke="${seam.color}" stroke-width="1.2"/>
  <line x1="${cx}" y1="${cy - 22}" x2="${cx}" y2="${cy + 22}" stroke="${seam.color}" stroke-width="1.2"/>
  <rect x="${cx - 6}" y="${cy - 6}" width="12" height="12" fill="none" stroke="${seam.color}" stroke-width="1.6"/>
  <rect x="${cx - 2}" y="${cy - 2}" width="4" height="4" fill="${seam.color}"/>

  <!-- corner ticks -->
  <path d="M${MAP.x} ${MAP.y + 16}V${MAP.y}H${MAP.x + 16}" fill="none" stroke="${seam.color}" stroke-width="2"/>
  <path d="M${MAP.x + MAP.w - 16} ${MAP.y + MAP.h}H${MAP.x + MAP.w}V${MAP.y + MAP.h - 16}" fill="none" stroke="${seam.color}" stroke-width="2"/>

  <!-- scale bar -->
  <line x1="${MAP.x + 16}" y1="${MAP.y + MAP.h - 22}" x2="${MAP.x + 116}" y2="${MAP.y + MAP.h - 22}" stroke="#EDE7DC" stroke-opacity="0.5" stroke-width="1.5"/>
  <text x="${MAP.x + 16}" y="${MAP.y + MAP.h - 30}" fill="#EDE7DC" fill-opacity="0.45" font-size="9" letter-spacing="2">50 KM</text>

  <!-- register -->
  <line x1="56" y1="${MAP.y + MAP.h + 40}" x2="${SIZE - 56}" y2="${MAP.y + MAP.h + 40}" stroke="#EDE7DC" stroke-opacity="0.14"/>
  ${cell(56, "SITE", site.id)}
  ${cell(212, "DISTRICT", district.name)}
  ${cell(430, "ELEVATION", `${site.metres} m`)}
  ${cell(560, "AREA", `${site.hectares} ha`)}
  ${cell(56, "PEGGED", amount, 84)}
  ${cell(212, "POSITION", coordLabel(site.x, site.y), 84)}
  ${cell(430, "GROUND", district.ground, 84)}
  ${cell(560, "REGISTER", formatTokenId(claim.id), 84)}
</svg>`;
}

function cell(x: number, label: string, value: string, dy = 0) {
  const y = MAP.y + MAP.h + 66 + dy;
  return `<text x="${x}" y="${y}" fill="#EDE7DC" fill-opacity="0.32" font-size="9" letter-spacing="2.6">${esc(label)}</text>
  <text x="${x}" y="${y + 20}" fill="#EDE7DC" font-size="13">${esc(value)}</text>`;
}

function fallback() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="#0B0B0C"/>
  <text x="50%" y="50%" text-anchor="middle" fill="#EDE7DC" fill-opacity="0.4" font-family="monospace" font-size="14" letter-spacing="4">SITE NOT ON SHEET</text>
</svg>`;
}
