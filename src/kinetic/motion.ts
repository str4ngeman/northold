import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { hasFinePointer, prefersReducedMotion } from "@/kinetic/scroll";

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

export function bindReveals(root: ParentNode, reduce: boolean) {
  const ctx = gsap.context(() => {
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el.dataset.bound === "1") return;
      el.dataset.bound = "1";
      if (reduce) return;

      const mode = el.dataset.reveal || "lines";
      const delay = (+(el.dataset.revealDelay || 0)) / 1000;
      const targets = mode === "fade" ? [el] : splitLines(el);

      gsap.from(targets, {
        yPercent: mode === "fade" ? 0 : 110,
        opacity: mode === "fade" ? 0 : 1,
        duration: 0.9,
        delay,
        ease: "expo.out",
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      });
    });
  });

  return ctx;
}

export function bindPaths(root: ParentNode, reduce: boolean) {
  const ctx = gsap.context(() => {
    root.querySelectorAll<SVGPathElement>("[data-path]").forEach((path) => {
      const trigger = path.closest("svg") ?? path;
      if (reduce) {
        path.style.strokeDashoffset = "0";
        return;
      }
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 1.6,
        ease: "power2.inOut",
        scrollTrigger: { trigger, start: "top 85%", once: true },
      });
    });
  });
  return ctx;
}

export function bindTravel(root: ParentNode, reduce: boolean) {
  if (reduce) return { revert() {} };
  const ctx = gsap.context(() => {
    gsap.utils.toArray<SVGLinearGradientElement>("[data-travel]").forEach((g, i) => {
      gsap.fromTo(
        g,
        { attr: { x1: "-20%", y1: "-20%", x2: "-15%", y2: "-15%" } },
        {
          attr: { x1: "110%", y1: "110%", x2: "120%", y2: "120%" },
          duration: gsap.utils.random(2.6, 4.8),
          repeat: -1,
          ease: "none",
          delay: i * 0.3 + gsap.utils.random(0, 1.6),
        },
      );
    });
  }, root as Element);
  return ctx;
}

export function bindMagnetic(root: ParentNode) {
  if (!hasFinePointer() || prefersReducedMotion()) return () => {};

  const cleanups: Array<() => void> = [];

  root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const strength = +(el.dataset.magneticStrength || 0.35);
    const qx = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, 0.6)" });
    const qy = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, 0.6)" });

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      qx((e.clientX - (r.left + r.width / 2)) * strength);
      qy((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      qx(0);
      qy(0);
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

export function bindGlassPointer(root: ParentNode) {
  if (!hasFinePointer()) return () => {};
  const cleanups: Array<() => void> = [];

  root.querySelectorAll<HTMLElement>("[data-glass]").forEach((el) => {
    const blob = el.querySelector<HTMLElement>("[data-glass-blob]");
    if (!blob) return;

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      blob.style.transform = `translate(${x * 0.35}px, ${y * 0.35}px)`;
    };
    const leave = () => {
      blob.style.transform = "translate(0, 0)";
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

export { ScrollTrigger };
