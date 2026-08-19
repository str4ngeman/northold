/**
 * Paints the field sheet once, into an offscreen canvas that the map then pans
 * and zooms. Relief is shaded at half resolution because it is smooth; the
 * contours, drainage and coastline are drawn as vectors at full resolution
 * because those are the lines people actually read.
 */
import { contour, FIELD, rivers, sampleGrid, type Grid } from "@/lib/field/terrain";

/** Elevation ramp: drowned rock, then bare ground warming as it climbs. */
const RAMP: [number, [number, number, number]][] = [
  [0.0, [4, 6, 10]],
  [0.2, [8, 13, 20]],
  [0.314, [13, 20, 29]],
  [0.316, [30, 30, 30]],
  [0.36, [28, 27, 25]],
  [0.46, [39, 36, 31]],
  [0.58, [55, 50, 41]],
  [0.7, [76, 68, 55]],
  [0.82, [104, 93, 74]],
  [1.0, [146, 133, 108]],
];

function ramp(e: number, out: [number, number, number]) {
  for (let i = 1; i < RAMP.length; i++) {
    if (e <= RAMP[i][0] || i === RAMP.length - 1) {
      const [a, ca] = RAMP[i - 1];
      const [b, cb] = RAMP[i];
      const t = Math.max(0, Math.min(1, (e - a) / (b - a || 1e-6)));
      out[0] = ca[0] + (cb[0] - ca[0]) * t;
      out[1] = ca[1] + (cb[1] - ca[1]) * t;
      out[2] = ca[2] + (cb[2] - ca[2]) * t;
      return;
    }
  }
}

/** Shaded relief at `w × h`, returned as ImageData ready to blit. */
export function shadeRelief(grid: Grid, w: number, h: number) {
  const img = new ImageData(w, h);
  const px = img.data;
  const gx = (grid.w - 1) / (w - 1);
  const gy = (grid.h - 1) / (h - 1);
  const rgb: [number, number, number] = [0, 0, 0];

  // Sun from the northwest, the way every survey sheet has ever lit its hills.
  const lx = -0.62;
  const ly = -0.62;
  const lz = 0.48;

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const u = i * gx;
      const v = j * gy;
      const e = sampleGrid(grid, u, v);

      const ex = sampleGrid(grid, u + 1, v) - sampleGrid(grid, u - 1, v);
      const ey = sampleGrid(grid, u, v + 1) - sampleGrid(grid, u, v - 1);

      // Exaggerate relief on land, flatten it under water.
      const k = e < FIELD.sea ? 3 : 26;
      const nx = -ex * k;
      const ny = -ey * k;
      const len = Math.sqrt(nx * nx + ny * ny + 1);
      const light = (nx * lx + ny * ly + lz) / len;

      ramp(e, rgb);
      let shade = 0.42 + light * 0.95;
      shade = Math.max(0.14, Math.min(1.6, shade));

      const o = (j * w + i) * 4;
      px[o] = Math.min(255, rgb[0] * shade);
      px[o + 1] = Math.min(255, rgb[1] * shade);
      px[o + 2] = Math.min(255, rgb[2] * shade);
      px[o + 3] = 255;
    }
  }
  return img;
}

type Painted = { canvas: HTMLCanvasElement; scale: number };

/** Full sheet: relief, contours, drainage, coastline. World units in, canvas out. */
export function paintSheet(grid: Grid, scale = 1.3): Painted {
  const cw = Math.round(FIELD.width * scale);
  const ch = Math.round(FIELD.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, scale };

  // relief, shaded at half the sheet's resolution and smoothed back up
  const rw = Math.round(cw / 2);
  const rh = Math.round(ch / 2);
  const relief = shadeRelief(grid, rw, rh);
  const tmp = document.createElement("canvas");
  tmp.width = rw;
  tmp.height = rh;
  tmp.getContext("2d")?.putImageData(relief, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tmp, 0, 0, cw, ch);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // contours above sea level, every fifth one heavier
  const levels = 22;
  for (let i = 1; i < levels; i++) {
    const level = FIELD.sea + ((1 - FIELD.sea) * i) / levels;
    const segs = contour(grid, level);
    if (!segs.length) continue;
    const major = i % 5 === 0;
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of segs) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.strokeStyle = major ? "rgba(237,231,220,0.24)" : "rgba(237,231,220,0.1)";
    ctx.lineWidth = major ? 0.9 : 0.5;
    ctx.stroke();
  }

  // drainage — thin at the head, heavier as channels join the coast
  for (const river of rivers(grid, 260)) {
    const pts = river.points;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    const weight = Math.min(2.1, 0.4 + river.order / 120);
    ctx.strokeStyle = `rgba(143,179,201,${Math.min(0.5, 0.16 + river.order / 700).toFixed(3)})`;
    ctx.lineWidth = weight;
    ctx.stroke();
  }

  // coastline last, so it sits on top of everything
  const shore = contour(grid, FIELD.sea);
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of shore) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.strokeStyle = "rgba(237,231,220,0.62)";
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.restore();
  return { canvas, scale };
}

/** Tiny thumbnail for the locator inset. */
export function paintThumb(grid: Grid, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.putImageData(shadeRelief(grid, w, h), 0, 0);
  return canvas;
}
