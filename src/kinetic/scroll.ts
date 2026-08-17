import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasFinePointer() {
  return window.matchMedia("(pointer: fine)").matches;
}

export function initScroll() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }

  const reduce = prefersReducedMotion();

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: !reduce,
    syncTouch: false,
    prevent: (node) => (node as HTMLElement).hasAttribute?.("data-lenis-prevent"),
  });

  const onTick = (time: number) => {
    lenis.raf(time * 1000);
  };

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(onTick);
  gsap.ticker.lagSmoothing(0);

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  void document.fonts?.ready.then(refresh);

  return {
    lenis,
    reduce,
    fine: hasFinePointer(),
    gsap,
    stop: () => lenis.stop(),
    start: () => lenis.start(),
    destroy: () => {
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(onTick);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    },
  };
}

export type ScrollHandle = ReturnType<typeof initScroll>;
