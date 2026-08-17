import type { Plan as PlanType, Token as TokenType } from "@/lib/types";

export function mapPlan(doc: {
  slug: string;
  name: string;
  tagline?: string;
  lockSeconds: number;
  minUsd: number;
  maxUsd: number;
  apyBps: number;
  emergencyFeeBps: number;
  active?: boolean;
  onChainId?: number;
}): PlanType {
  return {
    id: doc.slug,
    name: doc.name,
    tagline: doc.tagline ?? "",
    lockSeconds: doc.lockSeconds,
    minUsd: doc.minUsd,
    maxUsd: doc.maxUsd,
    apyBps: doc.apyBps,
    emergencyFeeBps: doc.emergencyFeeBps,
    active: doc.active !== false,
    onChainId: doc.onChainId,
  };
}

export function mapToken(doc: {
  slug: string;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  priceUsd: number;
  color?: string;
  active?: boolean;
}): TokenType {
  return {
    id: doc.slug,
    symbol: doc.symbol,
    name: doc.name,
    address: doc.address as `0x${string}`,
    decimals: doc.decimals,
    priceUsd: doc.priceUsd,
    color: doc.color ?? "#e2c36d",
    active: doc.active !== false,
  };
}
