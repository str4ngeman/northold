// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console2} from "forge-std/console2.sol";

import {LeagueVault} from "../src/LeagueVault.sol";
import {Fixture} from "./Fixture.sol";

/// @dev Time-travel simulations of the three catalog locks.
contract TimeTravelTest is Fixture {
    function test_sim_pulseLifecycle() public {
        uint256 t0 = block.timestamp;
        uint256 id = _mintUsdt(alice, pulseId, 1_000 * 1e6);

        vm.warp(t0 + 15 days);
        uint256 mid = vault.claimableOf(id);
        vm.prank(alice);
        (uint256 claimed,) = vault.claim(id);
        assertEq(claimed, mid);

        vm.warp(t0 + 30 days);
        assertTrue(vault.isMatured(id));
        vm.prank(alice);
        (uint256 principal, uint256 rest) = vault.unlock(id);
        assertEq(principal, 1_000 * 1e6);
        assertEq(claimed + rest, vault.positions(id).claimedReward);

        console2.log("pulse claimed mid-lock", claimed);
        console2.log("pulse residual coupon", rest);
    }

    function test_sim_horizonNinetyDays() public {
        uint256 t0 = block.timestamp;
        vm.prank(alice);
        uint256 id = vault.mint(address(weth), horizonId, 1 ether, address(0));

        vm.warp(t0 + 45 days);
        LeagueVault.Position memory pos = vault.positions(id);
        uint256 expectedHalf = (pos.principalUsd8 * pos.apyBps * 45 days * 1e6)
            / (1e8 * 10_000 * 31_557_600);
        assertApproxEqAbs(vault.claimableOf(id), expectedHalf, 1);

        vm.warp(t0 + 90 days);
        uint256 wethBefore = weth.balanceOf(alice);
        vm.prank(alice);
        (uint256 principal,) = vault.unlock(id);
        assertEq(principal, 1 ether);
        assertEq(weth.balanceOf(alice), wethBefore + 1 ether);
    }

    function test_sim_apexEmergencyThenCannotClaim() public {
        uint256 id = _mintUsdt(alice, apexId, 5_000 * 1e6);
        vm.warp(block.timestamp + 60 days);
        vm.prank(alice);
        vault.emergencyExit(id);
        assertEq(vault.claimableOf(id), 0);
        vm.prank(alice);
        vm.expectRevert(LeagueVault.NotLocked.selector);
        vault.claim(id);
    }

    function test_sim_warpPastCapDoesNotOverAccrue() public {
        uint256 id = _mintUsdt(alice, pulseId, 1_000 * 1e6);
        vm.warp(block.timestamp + 400 days);
        uint256 capped = vault.accruedOf(id);
        uint256 year = (uint256(1_000 * 1e6) * 800 * 30 days) / (10_000 * 31_557_600);
        assertEq(capped, year);
    }

    function test_sim_stepwiseClaimsSumToCap() public {
        uint256 id = _mintUsdt(alice, pulseId, 2_000 * 1e6);
        uint256 t0 = block.timestamp;
        uint256 total;
        for (uint256 i = 1; i <= 6; ++i) {
            vm.warp(t0 + i * 5 days);
            uint256 due = vault.claimableOf(id);
            if (due == 0) continue;
            vm.prank(alice);
            (uint256 paid,) = vault.claim(id);
            total += paid;
        }
        uint256 cap = (uint256(2_000 * 1e6) * 800 * 30 days) / (10_000 * 31_557_600);
        assertEq(total, cap);
    }
}
