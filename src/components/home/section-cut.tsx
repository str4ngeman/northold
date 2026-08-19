"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";

import { elevation, FIELD } from "@/lib/field/terrain";
import { formatLock } from "@/lib/format";
import { gradeLabel, SEAMS } from "@/lib/seams";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

const W = 1200;
const H = 470;
const SURF_TOP = 62;
const SURF_RANGE = 92;
const DEPTH_SPAN = 286;
const N = 300;
const SHAFT_AT = 0.335;
const MAX_M = 2400;

/** Depth is compressed with a power curve so the shallow seam is still legible. */
function depthY(m: number) {
  return Math.pow(m / MAX_M, 0.55) * DEPTH_SPAN;
}

/**
 * The Section — a traverse cut through the field, drawn live. The ground
 * scrolls past, the strata follow the topography, and the shaft drops to
 * whichever seam is selected. This is the whole product in one drawing:
 * depth is term, and the deeper band pays more because it is further to climb.
 */
export function SectionCut({
  plans,
  className,
  compact,
}: {
  plans: Plan[];
  className?: string;
  compact?: boolean;
}) {
  const [active, setActive] = useState(1);
  const surfaceRef = useRef<SVGPathElement | null>(null);
  const groundRef = useRef<SVGPathElement | null>(null);
  const bandRefs = useRef<(SVGPathElement | null)[]>([]);
  const shaftRef = useRef<SVGGElement | null>(null);
  const shaftLineRef = useRef<SVGLineElement | null>(null);
  const cageRef = useRef<SVGRectElement | null>(null);
  const depth = useRef({ m: SEAMS[1].metres[1] });

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const surface = new Float32Array(N + 1);
    let offset = 0;
    let last = performance.now();
    let raf = 0;

    const step = (x: number) => (x / N) * 1500;

    function compute() {
      for (let i = 0; i <= N; i++) {
        const wx = (offset + step(i)) % FIELD.width;
        // a gentle meander so the traverse never runs a straight line
        const wy = 500 + Math.sin((offset + step(i)) * 0.0022) * 120;
        const e = elevation(wx, wy);
        const t = Math.max(0, Math.min(1, (e - FIELD.sea) / (1 - FIELD.sea)));
        surface[i] = SURF_TOP + (1 - t) * SURF_RANGE;
      }
    }

    function draw() {
      let top = "";
      for (let i = 0; i <= N; i++) {
        top += `${i === 0 ? "M" : "L"}${((i / N) * W).toFixed(1)} ${surface[i].toFixed(1)}`;
      }
      surfaceRef.current?.setAttribute("d", top);
      groundRef.current?.setAttribute("d", `${top}L${W} ${H}L0 ${H}Z`);

      SEAMS.forEach((seam, k) => {
        const a = depthY(seam.metres[0]);
        const b = depthY(seam.metres[1]);
        let d = "";
        for (let i = 0; i <= N; i++) d += `${i === 0 ? "M" : "L"}${((i / N) * W).toFixed(1)} ${(surface[i] + a).toFixed(1)}`;
        for (let i = N; i >= 0; i--) d += `L${((i / N) * W).toFixed(1)} ${(surface[i] + b).toFixed(1)}`;
        bandRefs.current[k]?.setAttribute("d", `${d}Z`);
      });

      const si = Math.round(SHAFT_AT * N);
      const sy = surface[si];
      shaftRef.current?.setAttribute("transform", `translate(${(SHAFT_AT * W).toFixed(1)} ${sy.toFixed(1)})`);
      shaftLineRef.current?.setAttribute("y2", depthY(depth.current.m).toFixed(1));
      cageRef.current?.setAttribute("y", (depthY(depth.current.m) - 5).toFixed(1));
    }

    compute();
    draw();
    if (still) return;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      offset = (offset + dt * 11) % FIELD.width;
      compute();
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const tween = gsap.to(depth.current, {
      m: SEAMS[active].metres[1],
      duration: 1.1,
      ease: "power3.inOut",
    });
    return () => {
      tween.kill();
    };
  }, [active]);

  const seam = SEAMS[active];
  const plan = plans.find((p) => p.id === seam.slug) ?? plans[active] ?? plans[0];

  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Cross-section through the field showing three seams">
        <defs>
          {SEAMS.map((s) => (
            <pattern key={s.slug} id={`hatch-${s.key}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="9" stroke={s.color} strokeWidth="1.1" strokeOpacity="0.35" />
            </pattern>
          ))}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b0b0c" />
            <stop offset="1" stopColor="#101013" />
          </linearGradient>
          <clipPath id="cut">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>

        <rect width={W} height={H} fill="url(#sky)" />

        {/* depth grid */}
        {[0, 120, 600, 1200, 2400].map((m) => (
          <g key={m}>
            <line
              x1="0"
              x2={W}
              y1={SURF_TOP + SURF_RANGE + depthY(m)}
              y2={SURF_TOP + SURF_RANGE + depthY(m)}
              stroke="#EDE7DC"
              strokeOpacity="0.05"
            />
          </g>
        ))}

        <g clipPath="url(#cut)">
          {/* rock mass under the surface */}
          <path ref={groundRef} fill="#111013" />

          {SEAMS.map((s, k) => (
            <g key={s.slug}>
              <path
                ref={(el) => {
                  bandRefs.current[k] = el;
                }}
                fill={`url(#hatch-${s.key})`}
                stroke={s.color}
                strokeWidth={k === active ? 1.6 : 0.7}
                strokeOpacity={k === active ? 0.95 : 0.35}
                style={{ transition: "stroke-width .5s ease, stroke-opacity .5s ease" }}
              />
            </g>
          ))}

          <path ref={surfaceRef} fill="none" stroke="#EDE7DC" strokeWidth="1.6" />

          {/* the shaft, and the cage riding in it */}
          <g ref={shaftRef}>
            <path d="M-13 0 L0 -22 L13 0" fill="none" stroke="#EDE7DC" strokeWidth="1.4" />
            <line x1="-18" x2="18" y1="0" y2="0" stroke="#EDE7DC" strokeWidth="1.4" />
            <line ref={shaftLineRef} x1="0" x2="0" y1="0" y2={depthY(SEAMS[1].metres[1])} stroke={seam.color} strokeWidth="3" />
            <rect ref={cageRef} x="-7" y={depthY(SEAMS[1].metres[1]) - 5} width="14" height="10" fill={seam.color} />
          </g>
        </g>

        {/* depth axis */}
        {[0, 120, 600, 1200, 2400].map((m) => (
          <text
            key={m}
            x={W - 10}
            y={SURF_TOP + SURF_RANGE + depthY(m) - 5}
            textAnchor="end"
            fill="#EDE7DC"
            fillOpacity="0.3"
            fontSize="10"
            letterSpacing="2"
            fontFamily="ui-monospace, monospace"
          >
            {m === 0 ? "DATUM" : `${m} M`}
          </text>
        ))}
      </svg>

      {/* seam selector */}
      <div className={cn("mt-5 grid gap-px bg-[var(--rule)]", compact ? "sm:grid-cols-3" : "sm:grid-cols-3")}>
        {SEAMS.map((s, k) => {
          const p = plans.find((item) => item.id === s.slug);
          const on = k === active;
          return (
            <button
              key={s.slug}
              type="button"
              onMouseEnter={() => setActive(k)}
              onFocus={() => setActive(k)}
              onClick={() => setActive(k)}
              className={cn(
                "group bg-[#0b0b0c] p-4 text-left transition-colors",
                on ? "bg-[var(--slate)]" : "hover:bg-[var(--slate)]",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="tag" style={{ color: on ? s.color : undefined }}>
                  Seam {s.index}
                </span>
                <span className="num text-[10px] text-bone-3">{s.depth}</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="display text-2xl" style={{ color: on ? s.color : "var(--bone)" }}>
                  {s.name}
                </span>
                {p ? <span className="num text-sm text-bone-2">{gradeLabel(p.apyBps)}%</span> : null}
              </div>
              <p className="num mt-1.5 text-[10px] text-bone-3">
                {p ? formatLock(p.lockSeconds).replace(" lock", "").toUpperCase() : ""} · {s.matrix.toUpperCase()}
              </p>
            </button>
          );
        })}
      </div>

      {!compact ? (
        <p className="num mt-4 text-[10px] leading-relaxed tracking-[0.1em] text-bone-3">
          TRAVERSE 01 · LIVE CUT THROUGH THE FIELD · SHAFT SET TO {seam.name.toUpperCase()} ({plan ? formatLock(plan.lockSeconds).replace(" lock", "").toUpperCase() : ""})
        </p>
      ) : null}
    </div>
  );
}
