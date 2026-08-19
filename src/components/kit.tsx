"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

import { SEAMS, seamOf } from "@/lib/seams";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = "expo.out";
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

function still() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useScoped<T extends HTMLElement = HTMLDivElement>(
  setup: (root: T) => void | (() => void),
  deps: unknown[] = [],
) {
  const ref = useRef<T | null>(null);
  useBeforePaint(() => {
    const root = ref.current;
    if (!root) return;
    const ctx = gsap.context(() => setup(root), root);
    return () => ctx.revert();
  }, deps);
  return ref;
}

/* ================================================================ */
/* Motion — everything wipes or steps. Nothing floats or blurs.      */
/* ================================================================ */

/** A printed wipe: the block is dealt in left to right, like a plotter pass. */
export function Wipe({
  children,
  as = "div",
  className,
  style,
  delay = 0,
  stagger,
  start = "top 88%",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  stagger?: number;
  start?: string;
}) {
  const ref = useScoped(
    (root) => {
      const targets = stagger ? Array.from(root.children) : [root];
      if (!targets.length || still()) return;
      gsap.from(targets, {
        opacity: 0,
        y: 14,
        clipPath: "inset(0 100% 0 0)",
        duration: 0.95,
        delay,
        ease: EASE,
        stagger: stagger ?? 0,
        // drop the inline clip once it has served its purpose, so nothing
        // downstream is boxed in by a leftover clip-path
        clearProps: "clipPath",
        scrollTrigger: { trigger: root, start, once: true },
      });
    },
    [delay, stagger, start],
  );

  return createElement(as, { ref, className, style }, children);
}

/** Headline lines lifted out of a slot. Used once per section, never more. */
export function Lift({
  children,
  as = "h2",
  className,
  delay = 0,
  start = "top 90%",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  start?: string;
}) {
  const ref = useScoped(
    (root) => {
      if (still()) return;
      const split = SplitText.create(root, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        linesClass: "kit-line",
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 118,
            duration: 1.15,
            delay,
            ease: EASE,
            stagger: 0.08,
            scrollTrigger: { trigger: root, start, once: true },
          }),
      });
      return () => split.revert();
    },
    [delay, start],
  );

  return createElement(as, { ref, className: cn("[&_.kit-line]:pb-[0.08em]", className) }, children);
}

/** A number that rolls up when the row enters frame. */
export function Counter({
  value,
  format,
  className,
  duration = 1.5,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [text, setText] = useState(() => format(0));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (still()) {
      setText(format(value));
      return;
    }
    const counter = { n: 0 };
    const tween = gsap.to(counter, {
      n: value,
      duration,
      ease: EASE,
      onUpdate: () => setText(format(counter.n)),
      scrollTrigger: { trigger: el, start: "top 94%", once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={ref} className={cn("num", className)}>
      {text}
    </span>
  );
}

/** Conveyor of small items. Reverses with scroll direction. */
export function Belt({
  children,
  speed = 34,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useScoped<HTMLDivElement>((root) => {
    const track = root.querySelector<HTMLElement>("[data-belt]");
    if (!track || still()) return;
    const half = track.scrollWidth / 2;
    if (!half) return;
    const tween = gsap.to(track, {
      x: -half,
      duration: half / speed,
      ease: "none",
      repeat: -1,
      modifiers: { x: (v) => `${gsap.utils.wrap(-half, 0, parseFloat(v))}px` },
    });
    ScrollTrigger.create({
      trigger: root,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => tween.timeScale(self.direction === -1 ? -0.9 : 1),
    });
  }, []);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <div data-belt className="flex w-max items-center will-change-transform">
        {children}
        {children}
      </div>
    </div>
  );
}

/* ================================================================ */
/* Sheet furniture                                                   */
/* ================================================================ */

/** The section header: an index, a rule to the margin, and a caption. */
export function Head({
  index,
  title,
  meta,
  lead,
  className,
}: {
  index: string;
  title: ReactNode;
  meta?: string;
  lead?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Wipe className="flex items-center gap-4">
        <span className="tag whitespace-nowrap">§ {index}</span>
        <span className="h-px flex-1 bg-[var(--rule)]" />
        {meta ? <span className="tag whitespace-nowrap">{meta}</span> : null}
      </Wipe>
      <Lift className="display mt-7 text-[clamp(2.1rem,5.2vw,3.6rem)]">{title}</Lift>
      {lead ? (
        <Wipe delay={0.12}>
          <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-bone-2">{lead}</p>
        </Wipe>
      ) : null}
    </div>
  );
}

/** label ·············· value */
export function Row({
  label,
  value,
  accent,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-3 border-b border-[var(--rule)] py-2.5", className)}>
      <span className="tag shrink-0 normal-case tracking-[0.1em]">{label}</span>
      <span className="h-px min-w-4 flex-1 translate-y-[-2px] bg-[var(--rule)]" />
      <span className="num shrink-0 text-[0.8rem]" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}

/** A ruled bar with survey ticks. Reads as an instrument, not a progress pill. */
export function Meter({ value, color = "var(--flux)", ticks = 12 }: { value: number; color?: string; ticks?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="relative h-6">
      <div className="absolute inset-x-0 top-0 flex justify-between">
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <span key={i} className={cn("w-px bg-[var(--rule)]", i % 4 === 0 ? "h-2.5" : "h-1.5")} />
        ))}
      </div>
      <div className="absolute inset-x-0 top-3.5 h-px bg-[var(--rule)]" />
      <div className="absolute left-0 top-3 h-1 transition-[width] duration-700" style={{ width: `${pct * 100}%`, background: color }} />
      <div
        className="absolute top-1.5 h-4 w-px transition-[left] duration-700"
        style={{ left: `${pct * 100}%`, background: color }}
      />
    </div>
  );
}

/**
 * The depth ruler. Surface at the top, mantle at the bottom, seams banded
 * down the right edge. This is the one graphic that appears on every screen.
 */
export function DepthRule({
  active,
  height = 260,
  labels = true,
  className,
}: {
  active?: string;
  height?: number;
  labels?: boolean;
  className?: string;
}) {
  const max = 2400;
  const scale = (m: number) => Math.pow(m / max, 0.55) * height;

  return (
    <div className={cn("relative", className)} style={{ height }} aria-hidden>
      <span className="absolute left-0 top-0 h-full w-px bg-[var(--rule)]" />
      {SEAMS.map((seam) => {
        const top = scale(seam.metres[0]);
        const bottom = scale(seam.metres[1]);
        const on = active === seam.slug;
        return (
          <span key={seam.slug} className="absolute left-0" style={{ top, height: bottom - top }}>
            <span
              className="absolute left-0 top-0 w-[3px] transition-all duration-500"
              style={{ height: bottom - top, background: seam.color, opacity: on ? 1 : 0.28 }}
            />
            {labels ? (
              <span
                className="num absolute left-3 top-0 whitespace-nowrap text-[10px] transition-colors duration-500"
                style={{ color: on ? seam.color : "var(--bone-3)" }}
              >
                {seam.metres[0]} m · {seam.name}
              </span>
            ) : null}
          </span>
        );
      })}
      {[0, 120, 600, 1200, 2400].map((m) => (
        <span key={m} className="absolute left-0 h-px w-2 bg-[var(--rule)]" style={{ top: scale(m) }} />
      ))}
    </div>
  );
}

/** Small seam chip — colour, roman index, name. */
export function SeamChip({ planId, className }: { planId: string; className?: string }) {
  const seam = seamOf(planId);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="size-1.5" style={{ background: seam.color }} />
      <span className="tag" style={{ color: seam.color }}>
        {seam.index} · {seam.name}
      </span>
    </span>
  );
}

/** Survey crosshair. Decorative punctuation between blocks. */
export function Crosshair({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("size-3 text-bone-3", className)} aria-hidden>
      <path d="M8 0v16M0 8h16" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
