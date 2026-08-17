// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {LeagueMath} from "../src/libraries/LeagueMath.sol";

import {Fixture} from "./Fixture.sol";

contract MathTest is Fixture {
    function test_yearAccrualMatchesSpec() public pure {
        // $1000 * 8% * 1 year = $80, USDT 6 decimals
        uint256 accrued = LeagueMath.accruedReward(1_000 * 1e8, 800, LeagueMath.SECONDS_PER_YEAR, 6);
        assertEq(accrued, 80 * 1e6);
    }

    function test_partialYearPulse() public pure {
        uint256 elapsed = 32 days;
        uint256 accrued = LeagueMath.accruedReward(2_500 * 1e8, 800, elapsed, 6);
        // 2500 * 0.08 * 32/365.25
        uint256 expected = (uint256(2_500 * 1e6) * 800 * elapsed) / (10_000 * LeagueMath.SECONDS_PER_YEAR);
        assertEq(accrued, expected);
    }

    function test_rarityAndSize() public pure {
        assertEq(LeagueMath.sizeTier(100 * 1e8), LeagueMath.TIER_SPARK);
        assertEq(LeagueMath.sizeTier(1_000 * 1e8), LeagueMath.TIER_VAULT);
        assertEq(LeagueMath.sizeTier(10_000 * 1e8), LeagueMath.TIER_SOVEREIGN);

        assertEq(LeagueMath.rarity(uint32(30 days), 100 * 1e8), LeagueMath.RARITY_COMMON);
        assertEq(LeagueMath.rarity(uint32(90 days), 1_000 * 1e8), LeagueMath.RARITY_RARE);
        assertEq(LeagueMath.rarity(uint32(180 days), 1_000 * 1e8), LeagueMath.RARITY_EPIC);
        assertEq(LeagueMath.rarity(uint32(180 days), 10_000 * 1e8), LeagueMath.RARITY_LEGENDARY);
    }

    function test_emergencyFee() public pure {
        assertEq(LeagueMath.emergencyFee(1_000 * 1e6, 1500), 150 * 1e6);
    }

    function testFuzz_claimableNeverExceedsAccrued(uint128 accrued, uint128 claimed, uint8 status)
        public
        pure
    {
        status = uint8(status % 3);
        uint256 c = LeagueMath.claimable(accrued, claimed, status);
        if (status == LeagueMath.STATUS_EMERGENCY) assertEq(c, 0);
        else assertLe(c, accrued);
    }
}
