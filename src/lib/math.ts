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

export function accruedReward(principalAmount: number, apyBps: number, elapsed: number) {
  return principalAmount * (apyBps / 10_000) * (elapsed / SECONDS_PER_YEAR);
}

export function claimableReward(accrued: number, claimed: number, status: PositionStatus) {
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

export function projectedReward(principalAmount: number, apyBps: number, lockSeconds: number) {
  return accruedReward(principalAmount, apyBps, lockSeconds);
}

export function dailyReward(principalAmount: number, apyBps: number) {
  return accruedReward(principalAmount, apyBps, DAY_SECONDS);
}

/** USD value of a same-asset coupon, at the current price. */
export function projectedUsd(principalUsdValue: number, apyBps: number, lockSeconds: number) {
  return accruedReward(principalUsdValue, apyBps, lockSeconds);
}

export function dailyUsd(principalUsdValue: number, apyBps: number) {
  return accruedReward(principalUsdValue, apyBps, DAY_SECONDS);
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
  const accrued = accruedReward(position.principalAmount, plan.apyBps, elapsed);
  const claimable = claimableReward(accrued, position.claimedReward, position.status);
  const matured = isMatured(position, plan.lockSeconds, now);

  return {
    ...position,
    token,
    plan,
    principalUsd: usd,
    accruedReward: accrued,
    claimableReward: claimable,
    accruedUsd: accrued * token.priceUsd,
    claimableUsd: claimable * token.priceUsd,
    unlockAt: unlockAtMs(position.startedAt, plan.lockSeconds),
    lockProgress: lockProgress(position.startedAt, plan.lockSeconds, now),
    remainingMs: remainingMs(position.startedAt, plan.lockSeconds, now),
    isMatured: matured,
  };
}
