"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { hasFinePointer, prefersReducedMotion } from "@/kinetic/scroll";

export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState("");

  useEffect(() => {
    const root = ref.current;
    if (!root || !hasFinePointer() || prefersReducedMotion()) return;

    document.documentElement.classList.add("has-cursor");
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const target = { ...pos };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.18;
      pos.y += (target.y - pos.y) * 0.18;
      gsap.set(root, { x: pos.x, y: pos.y });
    };
    const onOver = (e: Event) => {
      const t = (e.target as Element | null)?.closest?.("[data-hover]") as HTMLElement | null;
      setState(t ? (t.dataset.hover === "true" ? "grow" : t.dataset.hover ?? "") : "");
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerover", onOver);
    gsap.ticker.add(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      gsap.ticker.remove(tick);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div ref={ref} className="cursor" data-state={state} aria-hidden="true">
      <span className="cursor__ring" />
      <span className="cursor__dot" />
    </div>
  );
}
