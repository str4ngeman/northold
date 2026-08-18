export type SeedPlan = {
  slug: string;
  lockSeconds: number;
  minUsd: number;
  maxUsd: number;
  apyBps: number;
  emergencyFeeBps: number;
  active: boolean;
};

export type PlanSeedFile = {
  referralBps: number;
  plans: SeedPlan[];
  oracle: Record<string, number>;
};

export type VaultPlanArgs = {
  slug: `0x${string}`;
  lockSeconds: number;
  minUsd8: bigint;
  maxUsd8: bigint;
  apyBps: number;
  emergencyFeeBps: number;
  active: boolean;
};

export function usdToUsd8(value: number): bigint {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("USD amount must be a finite number ≥ 0");
  }
  return BigInt(Math.round(value * 1e8));
}

export function usd8ToUsd(value: bigint): number {
  return Number(value) / 1e8;
}

export function slugToBytes32(slug: string): `0x${string}` {
  const bytes = new TextEncoder().encode(slug);
  if (bytes.length > 32) throw new Error("Plan slug is longer than 32 bytes");
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").padEnd(64, "0");
  return `0x${hex}`;
}

export function validatePlanInput(input: SeedPlan): string | null {
  if (!/^[a-z0-9-]{1,32}$/.test(input.slug)) {
    return "Slug must be 1–32 lowercase letters, numbers, or dashes";
  }
  if (!Number.isInteger(input.lockSeconds) || input.lockSeconds < 1 || input.lockSeconds > 0xffffffff) {
    return "Lock duration must be at least 1 second";
  }
  if (!Number.isFinite(input.minUsd) || !Number.isFinite(input.maxUsd) || input.minUsd < 0) {
    return "Min/max USD must be valid numbers";
  }
  if (input.maxUsd < input.minUsd) return "Max USD must be ≥ min USD";
  if (!Number.isInteger(input.apyBps) || input.apyBps < 0 || input.apyBps > 65_535) {
    return "APY is out of range";
  }
  if (!Number.isInteger(input.emergencyFeeBps) || input.emergencyFeeBps < 0 || input.emergencyFeeBps > 10_000) {
    return "Early exit fee must be between 0% and 100%";
  }
  return null;
}

export function validateReferralBps(bps: number): string | null {
  if (!Number.isInteger(bps) || bps < 0 || bps > 2_000) {
    return "Referral share must be between 0% and 20%";
  }
  return null;
}

export function toVaultPlan(input: SeedPlan): VaultPlanArgs {
  const error = validatePlanInput(input);
  if (error) throw new Error(error);
  return {
    slug: slugToBytes32(input.slug),
    lockSeconds: input.lockSeconds,
    minUsd8: usdToUsd8(input.minUsd),
    maxUsd8: usdToUsd8(input.maxUsd),
    apyBps: input.apyBps,
    emergencyFeeBps: input.emergencyFeeBps,
    active: Boolean(input.active),
  };
}
