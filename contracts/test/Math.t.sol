// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {NortholdMath} from "../src/libraries/NortholdMath.sol";

import {Fixture} from "./Fixture.sol";

contract MathTest is Fixture {
    function test_yearAccrualMatchesSpec() public pure {
        // $1000 USDT * 8% * 1 year = 80 USDT
        uint256 accrued = NortholdMath.accruedReward(1_000 * 1e6, 800, NortholdMath.SECONDS_PER_YEAR);
        assertEq(accrued, 80 * 1e6);
    }

    function test_partialYearPulse() public pure {
        uint256 elapsed = 32 days;
        uint256 accrued = NortholdMath.accruedReward(2_500 * 1e6, 800, elapsed);
        // 2500 * 0.08 * 32/365.25
        uint256 expected = (uint256(2_500 * 1e6) * 800 * elapsed) / (10_000 * NortholdMath.SECONDS_PER_YEAR);
        assertEq(accrued, expected);
    }

    function test_rarityAndSize() public pure {
        assertEq(NortholdMath.sizeTier(100 * 1e8), NortholdMath.TIER_SPARK);
        assertEq(NortholdMath.sizeTier(1_000 * 1e8), NortholdMath.TIER_VAULT);
        assertEq(NortholdMath.sizeTier(10_000 * 1e8), NortholdMath.TIER_SOVEREIGN);

        assertEq(NortholdMath.rarity(uint32(30 days), 100 * 1e8), NortholdMath.RARITY_COMMON);
        assertEq(NortholdMath.rarity(uint32(90 days), 1_000 * 1e8), NortholdMath.RARITY_RARE);
        assertEq(NortholdMath.rarity(uint32(180 days), 1_000 * 1e8), NortholdMath.RARITY_EPIC);
        assertEq(NortholdMath.rarity(uint32(180 days), 10_000 * 1e8), NortholdMath.RARITY_LEGENDARY);
    }

    function test_emergencyFee() public pure {
        assertEq(NortholdMath.emergencyFee(1_000 * 1e6, 1500), 150 * 1e6);
    }

    function testFuzz_claimableNeverExceedsAccrued(uint128 accrued, uint128 claimed, uint8 status)
        public
        pure
    {
        status = uint8(status % 3);
        uint256 c = NortholdMath.claimable(accrued, claimed, status);
        if (status == NortholdMath.STATUS_EMERGENCY) assertEq(c, 0);
        else assertLe(c, accrued);
    }
}
