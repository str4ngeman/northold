"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { prefersReducedMotion } from "@/kinetic/scroll";

gsap.registerPlugin(ScrollTrigger);

type RevealProps = {
  as?: ElementType;
  mode?: "lines" | "fade";
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

function splitLines(el: HTMLElement) {
  const raw = el.dataset.text ?? el.textContent?.trim() ?? "";
  el.dataset.text = raw;
  el.innerHTML = raw
    .split(/\s+/)
    .map((w) => `<span class="w">${w}</span>`)
    .join(" ");
  const rows = new Map<number, string[]>();
  el.querySelectorAll<HTMLElement>(".w").forEach((w) => {
    const top = Math.round(w.offsetTop);
    const list = rows.get(top) ?? [];
    list.push(w.textContent ?? "");
    rows.set(top, list);
  });
  el.innerHTML = [...rows.values()]
    .map(
      (line) =>
        `<span class="reveal__line"><span class="reveal__inner">${line.join(" ")}</span></span>`,
    )
    .join("");
  return [...el.querySelectorAll<HTMLElement>(".reveal__inner")];
}

export function Reveal({
  as: Tag = "div",
  mode = "lines",
  delay = 0,
  className,
  style,
  children,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let ctx: gsap.Context | undefined;
    let timer: number;

    const build = () => {
      ctx?.revert();
      if (prefersReducedMotion()) return;
      ctx = gsap.context(() => {
        const targets = mode === "fade" ? [node] : splitLines(node);
        gsap.from(targets, {
          yPercent: mode === "fade" ? 0 : 110,
          opacity: mode === "fade" ? 0 : 1,
          duration: 0.9,
          delay: delay / 1000,
          ease: "expo.out",
          stagger: 0.06,
          scrollTrigger: { trigger: node, start: "top 80%", once: true },
        });
      }, node);
    };

    const run = async () => {
      if (document.fonts) await document.fonts.ready;
      build();
    };
    void run();

    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
      ctx?.revert();
    };
  }, [mode, delay, children]);

  return (
    <Tag ref={ref} className={className} style={style} data-reveal={mode} data-reveal-delay={delay}>
      {children}
    </Tag>
  );
}
