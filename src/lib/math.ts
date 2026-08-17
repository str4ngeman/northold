import type {
  Plan,
  PositionNft,
  PositionStatus,
  PositionView,
  Rarity,
  SizeTier,
  Token,
} from "@/lib/types";

export const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
export const DAY_SECONDS = 24 * 3600;

export function principalUsd(amount: number, priceUsd: number) {
  return amount * priceUsd;
}

export function sizeTierFromUsd(usd: number): SizeTier {
  if (usd >= 10_000) return "sovereign";
  if (usd >= 1_000) return "vault";
  return "spark";
}

export function rarityFrom(lockSeconds: number, usd: number): Rarity {
  const lockScore = lockSeconds >= 180 * DAY_SECONDS ? 2 : lockSeconds >= 90 * DAY_SECONDS ? 1 : 0;
  const sizeScore = usd >= 10_000 ? 2 : usd >= 1_000 ? 1 : 0;
  const score = lockScore + sizeScore;
  if (score >= 4) return "legendary";
  if (score >= 3) return "epic";
  if (score >= 2) return "rare";
  return "common";
}

export function unlockAtMs(startedAt: number, lockSeconds: number) {
  return startedAt + lockSeconds * 1000;
}

function accrualStopMs(
  position: Pick<PositionNft, "startedAt" | "status" | "unlockedAt">,
  lockSeconds: number,
  now: number,
) {
  const cap = unlockAtMs(position.startedAt, lockSeconds);
  if (position.status === "emergencyExited" || position.status === "unlocked") {
    return Math.min(position.unlockedAt ?? now, cap);
  }
  return Math.min(now, cap);
}

export function elapsedSeconds(
  position: Pick<PositionNft, "startedAt" | "status" | "unlockedAt">,
  lockSeconds: number,
  now: number,
) {
  const stop = accrualStopMs(position, lockSeconds, now);
  return Math.max(0, (stop - position.startedAt) / 1000);
}

export function accruedUsdt(
  principalUsdValue: number,
  apyBps: number,
  elapsed: number,
) {
  return principalUsdValue * (apyBps / 10_000) * (elapsed / SECONDS_PER_YEAR);
}

export function claimableUsdt(
  accrued: number,
  claimed: number,
  status: PositionStatus,
) {
  if (status === "emergencyExited") return 0;
  return Math.max(0, accrued - claimed);
}

export function lockProgress(startedAt: number, lockSeconds: number, now: number) {
  return Math.min(1, Math.max(0, (now - startedAt) / (lockSeconds * 1000)));
}

export function remainingMs(startedAt: number, lockSeconds: number, now: number) {
  return Math.max(0, unlockAtMs(startedAt, lockSeconds) - now);
}

export function isMatured(
  position: Pick<PositionNft, "startedAt" | "status">,
  lockSeconds: number,
  now: number,
) {
  if (position.status === "unlocked" || position.status === "emergencyExited") {
    return false;
  }
  return now >= unlockAtMs(position.startedAt, lockSeconds);
}

export function projectedUsdt(principalUsdValue: number, apyBps: number, lockSeconds: number) {
  return accruedUsdt(principalUsdValue, apyBps, lockSeconds);
}

export function dailyUsdt(principalUsdValue: number, apyBps: number) {
  return accruedUsdt(principalUsdValue, apyBps, DAY_SECONDS);
}

export function emergencyFeeAmount(principalAmount: number, feeBps: number) {
  return principalAmount * (feeBps / 10_000);
}

export function buildPositionView(
  position: PositionNft,
  token: Token,
  plan: Plan,
  now: number,
): PositionView {
  const usd = principalUsd(position.principalAmount, token.priceUsd);
  const elapsed = elapsedSeconds(position, plan.lockSeconds, now);
  const accrued = accruedUsdt(usd, plan.apyBps, elapsed);
  const matured = isMatured(position, plan.lockSeconds, now);

  return {
    ...position,
    token,
    plan,
    principalUsd: usd,
    accruedUsdt: accrued,
    claimableUsdt: claimableUsdt(accrued, position.claimedUsdt, position.status),
    unlockAt: unlockAtMs(position.startedAt, plan.lockSeconds),
    lockProgress: lockProgress(position.startedAt, plan.lockSeconds, now),
    remainingMs: remainingMs(position.startedAt, plan.lockSeconds, now),
    isMatured: matured,
  };
}
