"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CompassMark } from "@/components/brand/mark";
import { CtaButton } from "@/components/ui/cta-button";

export function EmptyVault() {
  const [spins, setSpins] = useState(0);

  return (
    <div className="flex flex-col items-center rounded-[2rem] bg-white/[0.03] px-6 py-16 text-center ring-1 ring-white/8">
      <button
        type="button"
        className="grid size-24 place-items-center rounded-full bg-[var(--light)] text-[#16120a] shadow-[0_16px_40px_-12px_rgba(217,181,106,.7)]"
        onClick={() => {
          const next = spins + 1;
          setSpins(next);
          if (next === 5) {
            toast.message("The compass already knows. Open a hold.");
            setSpins(0);
          }
        }}
      >
        <CompassMark size={40} />
      </button>
      <h2 className="mt-6 text-2xl font-semibold">Nothing is holding yet</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--ink-2)]">
        Lock a token, mint the card, and that same token starts accruing immediately. Claim whenever you like.
      </p>
      <div className="mt-6">
        <CtaButton href="/app/stake">Open a hold</CtaButton>
      </div>
    </div>
  );
}
