"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";

import { buildGrid, contour, elevation, FIELD, metresAt, type Grid } from "@/lib/field/terrain";
import { paintSheet, paintThumb } from "@/lib/field/raster";
import {
  coordLabel,
  DISTRICTS,
  districtFields,
  districtSeam,
  SITES,
  type DistrictId,
  type Site,
} from "@/lib/field/world";
import { SEAMS } from "@/lib/seams";
import { cn } from "@/lib/utils";

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => window.setTimeout(resolve, 0)));

type Camera = { x: number; y: number; z: number };

const STAGES = [
  "Sampling elevation model",
  "Shading relief",
  "Cutting contours",
  "Tracing district bounds",
  "Plotting sites",
];

export function FieldMap({
  pegged,
  selectedId,
  onSelect,
  focusDistrict,
  className,
}: {
  pegged: Map<string, { color: string; symbol: string }>;
  selectedId: string | null;
  onSelect: (site: Site | null) => void;
  focusDistrict: DistrictId | null;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const thumbHostRef = useRef<HTMLDivElement | null>(null);
  const viewRectRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const zoomLabelRef = useRef<HTMLSpanElement | null>(null);

  const cam = useRef<Camera>({ x: 0, y: 0, z: 0.5 });
  const drag = useRef<{ px: number; py: number; cx: number; cy: number; moved: boolean } | null>(null);

  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [borders, setBorders] = useState<{ id: DistrictId; d: string; color: string }[]>([]);
  const [dense, setDense] = useState(false);
  const [far, setFar] = useState(true);

  /* ---------------- build the sheet ---------------- */

  useEffect(() => {
    let cancelled = false;
    let sheet: HTMLCanvasElement | null = null;
    let thumb: HTMLCanvasElement | null = null;

    void (async () => {
      setStep(0);
      await nextFrame();
      const grid: Grid = buildGrid(420, 264);
      if (cancelled) return;

      setStep(1);
      await nextFrame();
      const painted = paintSheet(grid, 1.35);
      if (cancelled) return;
      sheet = painted.canvas;
      sheet.style.width = `${FIELD.width}px`;
      sheet.style.height = `${FIELD.height}px`;
      sheet.style.display = "block";
      canvasHostRef.current?.replaceChildren(sheet);

      setStep(2);
      await nextFrame();
      thumb = paintThumb(grid, 168, 105);
      thumb.style.width = "168px";
      thumb.style.height = "105px";
      thumbHostRef.current?.replaceChildren(thumb);

      setStep(3);
      await nextFrame();
      const fields = districtFields(300, 190);
      const paths = fields.map(({ district, grid: field }) => {
        // a district line means nothing out at sea — drop anything below the shore
        const d = contour(field, 0)
          .filter(([x1, y1, x2, y2]) => elevation((x1 + x2) / 2, (y1 + y2) / 2) > FIELD.sea + 0.005)
          .map(([x1, y1, x2, y2]) => `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`)
          .join("");
        return { id: district.id, d, color: districtSeam(district.id).color };
      });
      if (cancelled) return;
      setBorders(paths);

      setStep(4);
      await nextFrame();
      if (cancelled) return;
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- camera ---------------- */

  const apply = useCallback(() => {
    const stage = stageRef.current;
    const host = hostRef.current;
    if (!stage || !host) return;
    const { x, y, z } = cam.current;
    stage.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${z})`;
    stage.style.setProperty("--iz", String(1 / z));

    if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${z.toFixed(2)}×`;
    setDense(z > 0.95);
    setFar(z < 0.45);

    const rect = viewRectRef.current;
    if (rect) {
      const pin = (v: number) => Math.max(0, Math.min(100, v));
      const left = pin(((-x / z) / FIELD.width) * 100);
      const top = pin(((-y / z) / FIELD.height) * 100);
      rect.style.left = `${left}%`;
      rect.style.top = `${top}%`;
      rect.style.width = `${Math.min(100 - left, pin((host.clientWidth / z / FIELD.width) * 100))}%`;
      rect.style.height = `${Math.min(100 - top, pin((host.clientHeight / z / FIELD.height) * 100))}%`;
    }
  }, []);

  const clamp = useCallback((next: Camera): Camera => {
    const host = hostRef.current;
    if (!host) return next;
    const z = Math.max(fitScale() * 0.9, Math.min(4.2, next.z));
    const w = FIELD.width * z;
    const h = FIELD.height * z;
    const cw = host.clientWidth;
    const ch = host.clientHeight;
    const slackX = Math.min(cw * 0.35, w * 0.3);
    const slackY = Math.min(ch * 0.35, h * 0.3);
    return {
      z,
      x: Math.max(Math.min(next.x, slackX), cw - w - slackX),
      y: Math.max(Math.min(next.y, slackY), ch - h - slackY),
    };
  }, []);

  function fitScale() {
    const host = hostRef.current;
    if (!host) return 0.5;
    return Math.min(host.clientWidth / FIELD.width, host.clientHeight / FIELD.height);
  }

  const fit = useCallback(
    (animate = false) => {
      const host = hostRef.current;
      if (!host) return;
      const z = fitScale() * 0.96;
      const target = {
        z,
        x: (host.clientWidth - FIELD.width * z) / 2,
        y: (host.clientHeight - FIELD.height * z) / 2,
      };
      if (!animate) {
        cam.current = target;
        apply();
        return;
      }
      gsap.to(cam.current, { ...target, duration: 0.9, ease: "expo.out", onUpdate: apply });
    },
    [apply],
  );

  const flyTo = useCallback(
    (x: number, y: number, z?: number) => {
      const host = hostRef.current;
      if (!host) return;
      const nz = z ?? Math.max(cam.current.z, fitScale() * 2.1);
      gsap.to(cam.current, {
        z: nz,
        x: host.clientWidth / 2 - x * nz,
        y: host.clientHeight / 2 - y * nz,
        duration: 1,
        ease: "expo.out",
        onUpdate: apply,
      });
    },
    [apply],
  );

  useEffect(() => {
    if (!ready) return;
    fit();
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => {
      cam.current = clamp(cam.current);
      apply();
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [ready, fit, clamp, apply]);

  useEffect(() => {
    if (!ready || !focusDistrict) return;
    const district = DISTRICTS.find((d) => d.id === focusDistrict);
    if (district) flyTo(district.x, district.y, fitScale() * 1.9);
  }, [focusDistrict, ready, flyTo]);

  useEffect(() => {
    if (!ready || !selectedId) return;
    const site = SITES.find((s) => s.id === selectedId);
    if (site) flyTo(site.x, site.y);
  }, [selectedId, ready, flyTo]);

  /* ---------------- pointer ---------------- */

  const toWorld = (clientX: number, clientY: number) => {
    const host = hostRef.current;
    if (!host) return { x: 0, y: 0 };
    const r = host.getBoundingClientRect();
    return {
      x: (clientX - r.left - cam.current.x) / cam.current.z,
      y: (clientY - r.top - cam.current.y) / cam.current.z,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, cx: cam.current.x, cy: cam.current.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const world = toWorld(e.clientX, e.clientY);
    if (readoutRef.current) {
      const inside = world.x >= 0 && world.y >= 0 && world.x <= FIELD.width && world.y <= FIELD.height;
      readoutRef.current.textContent = inside
        ? `${coordLabel(world.x, world.y)}   ELEV ${Math.max(0, metresAt(world.x, world.y))} m`
        : "OFF SHEET";
    }

    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    cam.current = clamp({ ...cam.current, x: d.cx + dx, y: d.cy + dy });
    apply();
  };

  const endDrag = () => {
    drag.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const host = hostRef.current;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const world = toWorld(e.clientX, e.clientY);
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    const next = clamp({ z: cam.current.z * factor, x: 0, y: 0 });
    cam.current = clamp({ z: next.z, x: mx - world.x * next.z, y: my - world.y * next.z });
    apply();
  };

  const nudge = (factor: number) => {
    const host = hostRef.current;
    if (!host) return;
    const mx = host.clientWidth / 2;
    const my = host.clientHeight / 2;
    const wx = (mx - cam.current.x) / cam.current.z;
    const wy = (my - cam.current.y) / cam.current.z;
    const target = clamp({ z: cam.current.z * factor, x: 0, y: 0 });
    gsap.to(cam.current, {
      z: target.z,
      x: mx - wx * target.z,
      y: my - wy * target.z,
      duration: 0.45,
      ease: "expo.out",
      onUpdate: apply,
    });
  };

  const visibleSites = useMemo(
    () => (focusDistrict ? SITES.filter((s) => s.districtId === focusDistrict) : SITES),
    [focusDistrict],
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#060607] select-none", className)}>
      <div
        ref={hostRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onWheel={onWheel}
      >
        <div
          ref={stageRef}
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{ width: FIELD.width, height: FIELD.height, ["--iz" as string]: "2" }}
        >
          <div ref={canvasHostRef} className="absolute inset-0" />

          <svg
            viewBox={`0 0 ${FIELD.width} ${FIELD.height}`}
            width={FIELD.width}
            height={FIELD.height}
            className="pointer-events-none absolute inset-0"
          >
            {borders.map((border) => (
              <path
                key={border.id}
                d={border.d}
                fill="none"
                stroke={border.color}
                strokeOpacity={focusDistrict && focusDistrict !== border.id ? 0.16 : 0.55}
                strokeWidth={1.2}
                strokeDasharray="7 5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* district names sit on the ground and fade out when you zoom in */}
          {DISTRICTS.map((district) => {
            const seam = districtSeam(district.id);
            return (
              <div
                key={district.id}
                className="pointer-events-none absolute origin-center whitespace-nowrap transition-opacity duration-500"
                style={{
                  left: district.x,
                  top: district.y,
                  transform: "translate(-50%,-50%) scale(var(--iz))",
                  opacity: dense ? 0.25 : focusDistrict && focusDistrict !== district.id ? 0.3 : 1,
                }}
              >
                <p
                  className={cn(
                    "num map-label text-center uppercase",
                    far ? "text-[9px] tracking-[0.2em]" : "text-[11px] tracking-[0.42em]",
                  )}
                  style={{ color: seam.color }}
                >
                  {district.name}
                </p>
                {!far ? (
                  <p className="num map-label mt-1 text-center text-[9px] uppercase tracking-[0.28em] text-bone-2">
                    {district.ground}
                  </p>
                ) : null}
              </div>
            );
          })}

          {/* sites */}
          {visibleSites.map((site) => {
            const peg = pegged.get(site.id);
            const on = selectedId === site.id;
            const seam = districtSeam(site.districtId);
            return (
              <button
                key={site.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect(on ? null : site)}
                className="group absolute z-10 origin-center"
                style={{ left: site.x, top: site.y, transform: "translate(-50%,-50%) scale(var(--iz))" }}
                aria-label={`${site.name}, site ${site.id}`}
              >
                <span className="relative grid size-8 place-items-center">
                  {on ? (
                    <>
                      <span className="absolute h-8 w-px" style={{ background: seam.color }} />
                      <span className="absolute h-px w-8" style={{ background: seam.color }} />
                    </>
                  ) : null}
                  <span
                    className={cn(
                      "block transition-all duration-200",
                      on ? "size-3" : peg ? "size-2.5" : "size-2 group-hover:size-2.5",
                    )}
                    style={{
                      background: peg ? seam.color : "transparent",
                      border: `1.5px solid ${peg || on ? seam.color : "rgba(237,231,220,0.55)"}`,
                    }}
                  />
                </span>
                <span
                  className={cn(
                    "num pointer-events-none absolute left-1/2 top-[calc(50%+14px)] -translate-x-1/2 whitespace-nowrap px-1 py-0.5 text-[9px] uppercase tracking-[0.14em] transition-opacity duration-200",
                    on || (dense && peg) ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                  style={{ background: "rgba(6,6,7,0.88)", color: on ? seam.color : "var(--bone-2)" }}
                >
                  {site.name}
                  {peg ? ` · ${peg.symbol}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- HUD ---------------- */}

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(6,6,7,0.75)]" />

      <div className="pointer-events-none absolute left-0 top-0 hidden p-4 lg:block">
        <div className="panel ticked pointer-events-auto bg-[#060607]/85 px-4 py-3 backdrop-blur-sm">
          <p className="tag">Sheet 01 — Northold Field Survey</p>
          <p className="num mt-2 text-[11px] text-bone-2">
            {SITES.length} sites · {DISTRICTS.length} districts · {pegged.size} pegged
          </p>
        </div>
      </div>

      <div className="absolute right-0 top-0 flex flex-col items-end gap-2 p-4">
        <div className="panel flex bg-[#060607]/85 backdrop-blur-sm">
          <button type="button" onClick={() => nudge(1.35)} className="grid size-9 place-items-center text-bone-2 transition-colors hover:text-flux" aria-label="Zoom in">
            <Plus className="size-3.5" />
          </button>
          <span className="w-px bg-[var(--rule)]" />
          <button type="button" onClick={() => nudge(0.74)} className="grid size-9 place-items-center text-bone-2 transition-colors hover:text-flux" aria-label="Zoom out">
            <Minus className="size-3.5" />
          </button>
          <span className="w-px bg-[var(--rule)]" />
          <button type="button" onClick={() => fit(true)} className="grid size-9 place-items-center text-bone-2 transition-colors hover:text-flux" aria-label="Fit sheet">
            <Maximize2 className="size-3.5" />
          </button>
        </div>
        <span ref={zoomLabelRef} className="num text-[10px] tracking-[0.18em] text-bone-3">
          0.50×
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 flex items-end gap-3 p-4">
        <div className="panel bg-[#060607]/85 px-4 py-3 backdrop-blur-sm">
          <p className="tag">Seams</p>
          <ul className="mt-2.5 space-y-1.5">
            {SEAMS.map((seam) => (
              <li key={seam.slug} className="flex items-center gap-2">
                <span className="size-2" style={{ background: seam.color }} />
                <span className="num text-[10px] text-bone-2">
                  {seam.index} · {seam.name}
                </span>
                <span className="num hidden text-[10px] text-bone-3 sm:inline">{seam.depth}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 hidden items-center gap-2 border-t border-[var(--rule)] pt-2.5 sm:flex">
            <span className="h-1.5 w-14 border-x border-b border-bone-3" />
            <span className="num text-[9px] tracking-[0.16em] text-bone-3">200 KM</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 hidden p-4 lg:block">
        <div className="panel bg-[#060607]/85 p-1 backdrop-blur-sm">
          <div className="relative h-[105px] w-[168px] overflow-hidden">
            <div ref={thumbHostRef} className="absolute inset-0" />
            <div
              ref={viewRectRef}
              className="pointer-events-none absolute border border-flux"
              style={{ left: 0, top: 0, width: "50%", height: "50%" }}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden justify-center pb-4 sm:flex">
        <span
          ref={readoutRef}
          className="num bg-[#060607]/85 px-3 py-1.5 text-[10px] tracking-[0.14em] text-bone-2 backdrop-blur-sm"
        >
          MOVE OVER THE SHEET
        </span>
      </div>

      {/* ---------------- survey splash ---------------- */}

      {!ready ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#060607]">
          <div className="w-[min(90vw,340px)]">
            <p className="tag tag-lit">Northold Field Survey</p>
            <p className="num mt-3 text-sm text-bone">{STAGES[step]}…</p>
            <div className="mt-4 h-px w-full bg-[var(--rule)]">
              <span
                className="block h-px bg-flux transition-[width] duration-500"
                style={{ width: `${((step + 1) / STAGES.length) * 100}%` }}
              />
            </div>
            <ul className="mt-5 space-y-1">
              {STAGES.map((label, i) => (
                <li
                  key={label}
                  className={cn(
                    "num text-[10px] uppercase tracking-[0.14em] transition-colors",
                    i < step ? "text-bone-3" : i === step ? "text-flux" : "text-bone-3/40",
                  )}
                >
                  {i < step ? "✓" : i === step ? "▸" : "·"} {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
