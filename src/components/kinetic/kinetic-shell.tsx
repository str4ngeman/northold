"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";
import "lenis/dist/lenis.css";

import { ChatWidget } from "@/components/chat-widget";
import { Preloader } from "@/components/kinetic/preloader";
import { ScrollProgress } from "@/components/kinetic/scroll-progress";
import { SiteNav } from "@/components/kinetic/site-nav";
import {
  bindGlassPointer,
  bindMagnetic,
  bindPaths,
  bindTravel,
} from "@/kinetic/motion";
import { initScroll, type ScrollHandle } from "@/kinetic/scroll";

gsap.registerPlugin(ScrollTrigger);

export function KineticShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [handle, setHandle] = useState<ScrollHandle | null>(null);
  const isHome = pathname === "/";
  const [boot, setBoot] = useState(false);
  const chrome = !pathname.startsWith("/admin");

  useEffect(() => {
    const next = initScroll();
    const firstHome = isHome && !sessionStorage.getItem("leagueto-welcome");
    if (!firstHome || next.reduce) next.start();
    else next.stop();
    setHandle(next);
    setBoot(firstHome);
    return () => next.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!handle) return;
    handle.lenis.scrollTo(0, { immediate: true });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [pathname, handle]);

  useEffect(() => {
    if (!handle) return;
    const reduce = handle.reduce;
    const mag = bindMagnetic(document.body);
    const glass = bindGlassPointer(document.body);
    const paths = bindPaths(document.body, reduce);
    const travel = bindTravel(document.body, reduce);
    return () => {
      mag();
      glass();
      paths.revert();
      travel.revert();
    };
  }, [pathname, handle]);

  return (
    <>
      {chrome && <SiteNav />}
      {boot && chrome && (
        <Preloader
          lenis={handle?.lenis ?? null}
          onDone={() => {
            sessionStorage.setItem("leagueto-welcome", "1");
            setBoot(false);
          }}
        />
      )}
      {chrome && <ScrollProgress lenis={handle?.lenis ?? null} />}
      {chrome && <ChatWidget />}
      {children}
    </>
  );
}

export type { Lenis };
