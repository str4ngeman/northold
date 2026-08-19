"use client";

import { Bench } from "@/components/home/bench";
import { Closing } from "@/components/home/closing";
import { FieldTeaser } from "@/components/home/field-teaser";
import { Hero } from "@/components/home/hero";
import { Ledger } from "@/components/home/ledger";
import { AssetBelt, SeamDeck } from "@/components/home/seam-deck";
import { Working } from "@/components/home/working";
import type { Plan } from "@/lib/types";

export function HomeView({ plans }: { plans: Plan[] }) {
  return (
    <main>
      <Hero plans={plans} />
      <AssetBelt />
      <SeamDeck plans={plans} />
      <Working />
      <Bench plans={plans} />
      <FieldTeaser />
      <Ledger />
      <Closing />
    </main>
  );
}
