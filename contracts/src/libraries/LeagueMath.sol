// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @dev Mirrors `src/lib/math.ts` so off-chain views and on-chain payouts agree.
library LeagueMath {
    using Math for uint256;

    uint256 internal constant BPS = 10_000;
    uint256 internal constant SECONDS_PER_YEAR = 31_557_600; // 365.25 days
    uint256 internal constant USD_DECIMALS = 8;
    uint256 internal constant DAY = 1 days;
    uint256 internal constant SPARK_USD8 = 1_000 * 10 ** USD_DECIMALS;
    uint256 internal constant SOVEREIGN_USD8 = 10_000 * 10 ** USD_DECIMALS;

    uint8 internal constant TIER_SPARK = 0;
    uint8 internal constant TIER_VAULT = 1;
    uint8 internal constant TIER_SOVEREIGN = 2;

    uint8 internal constant RARITY_COMMON = 0;
    uint8 internal constant RARITY_RARE = 1;
    uint8 internal constant RARITY_EPIC = 2;
    uint8 internal constant RARITY_LEGENDARY = 3;

    uint8 internal constant STATUS_LOCKED = 0;
    uint8 internal constant STATUS_UNLOCKED = 1;
    uint8 internal constant STATUS_EMERGENCY = 2;

    function principalUsd8(uint256 amount, uint8 tokenDecimals, uint256 priceUsd8)
        internal
        pure
        returns (uint256)
    {
        return amount.mulDiv(priceUsd8, 10 ** uint256(tokenDecimals));
    }

    function sizeTier(uint256 usd8) internal pure returns (uint8) {
        if (usd8 >= SOVEREIGN_USD8) return TIER_SOVEREIGN;
        if (usd8 >= SPARK_USD8) return TIER_VAULT;
        return TIER_SPARK;
    }

    function rarity(uint32 lockSeconds, uint256 usd8) internal pure returns (uint8) {
        uint256 lockScore = lockSeconds >= 180 * DAY ? 2 : lockSeconds >= 90 * DAY ? 1 : 0;
        uint256 sizeScore = usd8 >= SOVEREIGN_USD8 ? 2 : usd8 >= SPARK_USD8 ? 1 : 0;
        uint256 score = lockScore + sizeScore;
        if (score >= 4) return RARITY_LEGENDARY;
        if (score >= 3) return RARITY_EPIC;
        if (score >= 2) return RARITY_RARE;
        return RARITY_COMMON;
    }

    function accruedReward(
        uint256 principalUsd8_,
        uint16 apyBps,
        uint256 elapsed,
        uint8 rewardDecimals
    ) internal pure returns (uint256) {
        if (principalUsd8_ == 0 || apyBps == 0 || elapsed == 0) return 0;
        uint256 num = principalUsd8_.mulDiv(uint256(apyBps) * elapsed, 1);
        uint256 den = (10 ** USD_DECIMALS) * BPS * SECONDS_PER_YEAR;
        return num.mulDiv(10 ** uint256(rewardDecimals), den);
    }

    function claimable(uint256 accrued, uint256 claimed, uint8 status)
        internal
        pure
        returns (uint256)
    {
        if (status == STATUS_EMERGENCY) return 0;
        return accrued > claimed ? accrued - claimed : 0;
    }

    function emergencyFee(uint256 principal, uint16 feeBps) internal pure returns (uint256) {
        return principal.mulDiv(feeBps, BPS);
    }

    function lockProgressBps(uint64 startedAt, uint32 lockSeconds, uint64 nowTs)
        internal
        pure
        returns (uint256)
    {
        if (nowTs <= startedAt) return 0;
        uint256 elapsed = uint256(nowTs - startedAt);
        uint256 lock = uint256(lockSeconds);
        if (elapsed >= lock) return BPS;
        return elapsed.mulDiv(BPS, lock);
    }
}
