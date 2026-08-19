/**
 * The Field — one continent, generated the same way every time, on the server
 * and in the browser. Everything downstream (the map raster, the contour
 * sheet, the claim plates, the site list) reads from these functions, so a
 * coordinate always means the same ground.
 */

export const FIELD = {
  width: 1600,
  height: 1000,
  /** Anything under this is water. */
  sea: 0.315,
  /** Elevation 1.0 in metres, so the sheet can talk in real units. */
  relief: 2400,
} as const;

/* ---------------------------------------------------------------- */
/* Noise                                                             */
/* ---------------------------------------------------------------- */

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Value noise with a quintic fade — smooth enough for contours to look drawn. */
function value2(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = fade(x - xi);
  const yf = fade(y - yi);
  return lerp(
    lerp(hash2(xi, yi), hash2(xi + 1, yi), xf),
    lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), xf),
    yf,
  );
}

function fbm(x: number, y: number, octaves: number) {
  let v = 0;
  let amp = 0.5;
  let norm = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i++) {
    v += amp * value2(fx, fy);
    norm += amp;
    amp *= 0.5;
    // rotate each octave so the grid never shows through
    const rx = fx * 1.94 + fy * 0.42;
    const ry = fy * 1.94 - fx * 0.42;
    fx = rx;
    fy = ry;
  }
  return v / norm;
}

function ridged(x: number, y: number, octaves: number) {
  return 1 - Math.abs(fbm(x, y, octaves) * 2 - 1);
}

function smoothstep(a: number, b: number, t: number) {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/* ---------------------------------------------------------------- */
/* Elevation                                                         */
/* ---------------------------------------------------------------- */

const S = 330;

/** World coordinates in, 0..1 elevation out. Deterministic and pure. */
export function elevation(x: number, y: number) {
  const nx = x / S;
  const ny = y / S;

  // Warp the sample point so ridges bend and valleys wander.
  const wx = fbm(nx + 5.2, ny + 1.3, 4) - 0.5;
  const wy = fbm(nx - 3.7, ny + 8.1, 4) - 0.5;
  const px = nx + wx * 2.2;
  const py = ny + wy * 2.2;

  const base = fbm(px, py, 6);
  const spine = Math.pow(ridged(px * 0.66 + 11.4, py * 0.66 - 4.2, 4), 2.4);
  let e = base * 0.66 + spine * 0.48;

  // Elliptical continent falloff, roughened so the coast is never a curve.
  const dx = (x - FIELD.width * 0.5) / (FIELD.width * 0.53);
  const dy = (y - FIELD.height * 0.48) / (FIELD.height * 0.56);
  const dist = Math.sqrt(dx * dx + dy * dy) + (fbm(nx * 0.6 + 30.5, ny * 0.6 + 7.2, 3) - 0.5) * 0.34;
  const land = 1 - smoothstep(0.58, 1.04, dist);

  e = e * (0.3 + 0.7 * land) - (1 - land) * 0.34;

  // A couple of inland basins so the interior is not one dome.
  const basin = smoothstep(0.34, 0.0, Math.hypot((x - 1090) / 250, (y - 690) / 190));
  e -= basin * 0.2;

  return Math.max(0, Math.min(1, e));
}

export function metresAt(x: number, y: number) {
  return Math.round(((elevation(x, y) - FIELD.sea) / (1 - FIELD.sea)) * FIELD.relief);
}

/* ---------------------------------------------------------------- */
/* Grids                                                             */
/* ---------------------------------------------------------------- */

export type Grid = { w: number; h: number; data: Float32Array; sx: number; sy: number };

/** Sample the world onto a raster grid. `sx`/`sy` are world units per cell. */
export function buildGrid(w: number, h: number): Grid {
  const data = new Float32Array(w * h);
  const sx = FIELD.width / (w - 1);
  const sy = FIELD.height / (h - 1);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      data[j * w + i] = elevation(i * sx, j * sy);
    }
  }
  return { w, h, data, sx, sy };
}

export function sampleGrid(grid: Grid, gx: number, gy: number) {
  const x = Math.max(0, Math.min(grid.w - 1.001, gx));
  const y = Math.max(0, Math.min(grid.h - 1.001, gy));
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const a = grid.data[j * grid.w + i];
  const b = grid.data[j * grid.w + i + 1];
  const c = grid.data[(j + 1) * grid.w + i];
  const d = grid.data[(j + 1) * grid.w + i + 1];
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

/* ---------------------------------------------------------------- */
/* Contours — marching squares                                       */
/* ---------------------------------------------------------------- */

export type Segment = [number, number, number, number];

/** Line segments in world coordinates for one elevation level. */
export function contour(grid: Grid, level: number): Segment[] {
  const out: Segment[] = [];
  const { w, h, data, sx, sy } = grid;

  const cross = (v0: number, v1: number) => (level - v0) / (v1 - v0 || 1e-6);

  for (let j = 0; j < h - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const tl = data[j * w + i];
      const tr = data[j * w + i + 1];
      const br = data[(j + 1) * w + i + 1];
      const bl = data[(j + 1) * w + i];

      let code = 0;
      if (tl > level) code |= 8;
      if (tr > level) code |= 4;
      if (br > level) code |= 2;
      if (bl > level) code |= 1;
      if (code === 0 || code === 15) continue;

      const x0 = i * sx;
      const y0 = j * sy;
      const top: [number, number] = [x0 + cross(tl, tr) * sx, y0];
      const right: [number, number] = [x0 + sx, y0 + cross(tr, br) * sy];
      const bottom: [number, number] = [x0 + cross(bl, br) * sx, y0 + sy];
      const left: [number, number] = [x0, y0 + cross(tl, bl) * sy];

      const push = (a: [number, number], b: [number, number]) => out.push([a[0], a[1], b[0], b[1]]);

      switch (code) {
        case 1:
        case 14:
          push(left, bottom);
          break;
        case 2:
        case 13:
          push(bottom, right);
          break;
        case 3:
        case 12:
          push(left, right);
          break;
        case 4:
        case 11:
          push(top, right);
          break;
        case 6:
        case 9:
          push(top, bottom);
          break;
        case 7:
        case 8:
          push(left, top);
          break;
        case 5:
          push(left, top);
          push(bottom, right);
          break;
        case 10:
          push(left, bottom);
          push(top, right);
          break;
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------- */
/* Drainage                                                          */
/* ---------------------------------------------------------------- */

export type River = { points: [number, number][]; order: number };

function gradientAt(grid: Grid, x: number, y: number) {
  const d = 3;
  const gx = sampleGrid(grid, (x + d) / grid.sx, y / grid.sy) - sampleGrid(grid, (x - d) / grid.sx, y / grid.sy);
  const gy = sampleGrid(grid, x / grid.sx, (y + d) / grid.sy) - sampleGrid(grid, x / grid.sx, (y - d) / grid.sy);
  return [gx, gy] as const;
}

/** Follow the ground downhill from high seeds until it reaches the sea. */
export function rivers(grid: Grid, seeds = 220): River[] {
  const out: River[] = [];
  let s = 1337;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  for (let k = 0; k < seeds; k++) {
    let x = rand() * FIELD.width;
    let y = rand() * FIELD.height;
    if (elevation(x, y) < FIELD.sea + 0.22) continue;

    const points: [number, number][] = [[x, y]];
    let vx = 0;
    let vy = 0;
    for (let step = 0; step < 260; step++) {
      const [gx, gy] = gradientAt(grid, x, y);
      const len = Math.hypot(gx, gy) || 1e-6;
      // inertia keeps the channel from zig-zagging cell to cell
      vx = vx * 0.55 - (gx / len) * 4.6;
      vy = vy * 0.55 - (gy / len) * 4.6;
      x += vx;
      y += vy;
      if (x < 0 || y < 0 || x > FIELD.width || y > FIELD.height) break;
      points.push([x, y]);
      if (sampleGrid(grid, x / grid.sx, y / grid.sy) < FIELD.sea) break;
    }
    if (points.length > 26) out.push({ points, order: points.length });
  }
  return out.sort((a, b) => a.order - b.order);
}

/* ---------------------------------------------------------------- */
/* Local patch — used for claim plates                               */
/* ---------------------------------------------------------------- */

/** A small square of ground around a point, for the survey plate on a claim. */
export function patch(cx: number, cy: number, span: number, res: number): Grid {
  const data = new Float32Array(res * res);
  const step = span / (res - 1);
  const ox = cx - span / 2;
  const oy = cy - span / 2;
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      data[j * res + i] = elevation(ox + i * step, oy + j * step);
    }
  }
  return { w: res, h: res, data, sx: step, sy: step };
}
