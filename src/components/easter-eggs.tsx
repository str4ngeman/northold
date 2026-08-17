"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { BRAND } from "@/lib/brand";

type Easter = {
  aurora: boolean;
  tapLogo: () => void;
};

const EasterContext = createContext<Easter>({ aurora: false, tapLogo: () => {} });

export function useEaster() {
  return useContext(EasterContext);
}

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export function EasterEggs({ children }: { children: ReactNode }) {
  const [aurora, setAurora] = useState(false);
  const [taps, setTaps] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(BRAND.storage.aurora) === "1";
    setAurora(stored);
    document.documentElement.dataset.aurora = stored ? "true" : "false";
  }, []);

  useEffect(() => {
    const seq: string[] = [];
    function onKey(event: KeyboardEvent) {
      seq.push(event.key);
      if (seq.length > KONAMI.length) seq.shift();
      if (KONAMI.every((key, i) => seq[i]?.toLowerCase() === key.toLowerCase())) {
        const next = document.documentElement.dataset.aurora !== "true";
        document.documentElement.dataset.aurora = next ? "true" : "false";
        localStorage.setItem(BRAND.storage.aurora, next ? "1" : "0");
        setAurora(next);
        toast.success(next ? "Aurora on. The north got louder." : "Aurora off. Polar night again.");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function tapLogo() {
    const next = taps + 1;
    setTaps(next);
    if (next === 7) {
      toast.success("The hold noticed you. Keep the bearing.");
      setTaps(0);
    }
  }

  return <EasterContext.Provider value={{ aurora, tapLogo }}>{children}</EasterContext.Provider>;
}
