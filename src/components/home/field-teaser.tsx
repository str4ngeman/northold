"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";

import { Head, Wipe } from "@/components/kit";
import { buildGrid, FIELD } from "@/lib/field/terrain";
import { paintSheet } from "@/lib/field/raster";
import { DISTRICTS, districtSeam, SITES } from "@/lib/field/world";
import { formatLock } from "@/lib/format";
import { districtPlan } from "@/lib/field/world";
import { gradeLabel } from "@/lib/seams";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * A live cut of the real sheet — same elevation model, same districts, drawn
 * on the fly once the section is near the viewport so it never competes with
 * the hero for the main thread.
 */
export function FieldTeaser() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let done = false;
    const build = () => {
      if (done) return;
      done = true;
      window.setTimeout(() => {
        const grid = buildGrid(300, 188);
        const { canvas } = paintSheet(grid, 0.72);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        canvas.style.objectFit = "cover";
        canvasHostRef.current?.replaceChildren(canvas);
        setDrawn(true);
      }, 40);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          build();
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(host);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!drawn) return;
    const host = canvasHostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        host,
        { yPercent: -6, scale: 1.08 },
        {
          yPercent: 6,
          scale: 1.14,
          ease: "none",
          scrollTrigger: { trigger: host, start: "top bottom", end: "bottom top", scrub: 0.6 },
        },
      );
    }, host);
    return () => ctx.revert();
  }, [drawn]);

  return (
    <section id="field" ref={hostRef} className="border-y border-[var(--rule)] bg-[#080809]">
      <div className="mx-auto max-w-[1280px] px-4 py-24 lg:px-12 lg:py-32">
        <Head
          index="04"
          meta={`${SITES.length} sites surveyed`}
          title={
            <>
              The ground is <span className="text-flux">mapped</span>, not imagined.
            </>
          }
          lead="Northold is building the deposit out into a place. One continent, six districts, every contour cut from a single elevation model — so a coordinate always means the same ridge, on the map, on the plate, and in the register."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.35fr_.65fr] lg:gap-14">
          <Wipe>
            <Link
              href="/universe"
              className="group relative block aspect-[16/10] overflow-hidden border border-[var(--rule)] bg-[#060607]"
            >
              <div ref={canvasHostRef} className="absolute inset-0" />
              {!drawn ? (
                <span className="num absolute inset-0 grid place-items-center text-[10px] tracking-[0.22em] text-bone-3">
                  RENDERING SHEET…
                </span>
              ) : null}
              <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_30px_rgba(6,6,7,0.85)]" />

              {DISTRICTS.map((district) => {
                const seam = districtSeam(district.id);
                return (
                  <span
                    key={district.id}
                    className="num map-label pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.28em] transition-opacity duration-700"
                    style={{
                      left: `${(district.x / FIELD.width) * 100}%`,
                      top: `${(district.y / FIELD.height) * 100}%`,
                      color: seam.color,
                      opacity: drawn ? 0.9 : 0,
                    }}
                  >
                    {district.code}
                  </span>
                );
              })}

              <span className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-[#060607]/85 px-4 py-3 backdrop-blur-sm">
                <span className="num text-[10px] tracking-[0.16em] text-bone-2">
                  SHEET 01 · SHADED RELIEF · 20 M CONTOURS
                </span>
                <span className="num flex items-center gap-1.5 text-[10px] tracking-[0.16em] text-flux">
                  OPEN
                  <ArrowUpRight className="size-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </span>
            </Link>
          </Wipe>

          <Wipe delay={0.1} stagger={0.07} className="flex flex-col justify-center">
            {DISTRICTS.map((district) => {
              const seam = districtSeam(district.id);
              const plan = districtPlan(district.id);
              return (
                <div key={district.id} className="border-b border-[var(--rule)] py-3.5 first:border-t">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <span className="size-2" style={{ background: seam.color }} />
                      <span className="text-[0.9rem]">{district.name}</span>
                    </span>
                    <span className="num text-[10px] text-bone-3">{district.code}</span>
                  </div>
                  <p className="num mt-2 text-[10px] tracking-[0.12em] text-bone-3">
                    {district.ground.toUpperCase()} · {gradeLabel(plan.apyBps)}% ·{" "}
                    {formatLock(plan.lockSeconds).replace(" lock", "").toUpperCase()}
                  </p>
                </div>
              );
            })}
          </Wipe>
        </div>
      </div>
    </section>
  );
}
