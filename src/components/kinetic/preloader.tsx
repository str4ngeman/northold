"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import type Lenis from "lenis";

import { CircleText } from "@/components/kinetic/circle-text";
import { prefersReducedMotion } from "@/kinetic/scroll";

export function Preloader({
  lenis,
  onDone,
}: {
  lenis: Lenis | null;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!lenis) return;

    const reduce = prefersReducedMotion();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      lenis.start();
      setVisible(false);
      onDone();
    };
    const failsafe = window.setTimeout(finish, 4000);

    const run = async () => {
      if (reduce) {
        finish();
        return;
      }
      if (document.fonts) await document.fonts.ready;

      const pick = (s: string) => document.querySelector(`[data-welcome="${s}"]`);
      const all = (s: string) => document.querySelectorAll(`[data-welcome="${s}"]`);
      const title = pick("title");
      const bloom = pick("bloom");
      const header = pick("header");
      const marquee = pick("marquee");
      const circle = pick("circle");
      const percent = pick("percent");

      const tl = gsap.timeline({
        defaults: { ease: "expo.out", duration: 1.2 },
        onComplete: finish,
      });

      tl.to("[data-preloader]", { opacity: 0, duration: 0.6, pointerEvents: "none" });
      if (bloom) tl.from(bloom, { opacity: 0, scale: 1.15, duration: 2.4 }, 0.1);
      if (title) tl.from(title, { yPercent: 110, duration: 1.4 }, 0.25);
      const buttons = all("button");
      if (buttons.length) tl.from(buttons, { y: 24, opacity: 0, stagger: 0.08 }, 0.7);
      if (header) tl.from(header, { yPercent: -100 }, 0.5);
      if (marquee) tl.from(marquee, { opacity: 0, duration: 1.6 }, 0.6);
      if (circle) tl.from(circle, { opacity: 0, scale: 0.7, rotate: -90 }, 0.8);
      if (percent) tl.from(percent, { opacity: 0, x: 20 }, 1.0);
      tl.add(() => lenis.start(), 0.9);
    };

    void run();
    return () => window.clearTimeout(failsafe);
    // onDone is a render callback; finish() is guarded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lenis]);

  if (!visible) return null;

  return (
    <div className="preloader" data-preloader>
      <CircleText text="Sealing vault" duration={8}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </CircleText>
    </div>
  );
}
