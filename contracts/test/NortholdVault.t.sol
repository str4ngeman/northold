// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {NortholdLens} from "../src/NortholdLens.sol";
import {NortholdMath} from "../src/libraries/NortholdMath.sol";
import {NortholdVault} from "../src/NortholdVault.sol";
import {Fixture} from "./Fixture.sol";

contract NortholdVaultTest is Fixture {
    function test_mintMintsNumberedCard() public {
        uint256 id = _mintUsdt(alice, pulseId, 1_000 * 1e6);
        assertEq(id, 1);
        assertEq(card.ownerOf(id), alice);
        NortholdVault.Position memory pos = vault.positions(id);
        assertEq(pos.principal, 1_000 * 1e6);
        assertEq(pos.principalUsd8, 1_000 * USD8);
        assertEq(pos.status, 0);
        assertEq(pos.sizeTier, NortholdMath.TIER_VAULT);
        assertEq(pos.rarity, NortholdMath.RARITY_COMMON);
    }

    function test_mintRevertsBelowMin() public {
        vm.prank(alice);
        vm.expectRevert(NortholdVault.AmountOutOfRange.selector);
        vault.mint(address(usdt), pulseId, 50 * 1e6, address(0));
    }

    function test_mintRevertsAboveMax() public {
        vm.prank(alice);
        vm.expectRevert(NortholdVault.AmountOutOfRange.selector);
        vault.mint(address(usdt), pulseId, 20_000 * 1e6, address(0));
    }

    function test_wethPrincipalUsdAndTraits() public {
        vm.prank(alice);
        uint256 id = vault.mint(address(weth), apexId, 1 ether, address(0));
        NortholdVault.Position memory pos = vault.positions(id);
        assertEq(pos.principalUsd8, 3_500 * USD8);
        assertEq(pos.sizeTier, NortholdMath.TIER_VAULT);
        assertEq(pos.rarity, NortholdMath.RARITY_EPIC);
    }

    function test_claimAfterTime() public {
        uint256 yearId = _yearPlan();
        uint256 id = _mintUsdt(alice, yearId, 1_000 * 1e6);
        vm.warp(block.timestamp + 31_557_600);
        uint256 before = usdt.balanceOf(alice);
        vm.prank(alice);
        (uint256 paid,) = vault.claim(id);
        assertEq(paid, 80 * 1e6);
        assertEq(usdt.balanceOf(alice) - before, 80 * 1e6);
        vm.prank(alice);
        vm.expectRevert(NortholdVault.NothingToClaim.selector);
        vault.claim(id);
    }

    function test_unlockBeforeMaturityReverts() public {
        uint256 id = _mintUsdt(alice, pulseId, 1_000 * 1e6);
        vm.prank(alice);
        vm.expectRevert(NortholdVault.StillLocked.selector);
        vault.unlock(id);
    }

    function test_unlockReturnsPrincipalAndCoupon() public {
        uint256 id = _mintUsdt(alice, pulseId, 2_500 * 1e6);
        uint256 startBal = usdt.balanceOf(alice);
        vm.warp(block.timestamp + 30 days);
        vm.prank(alice);
        (uint256 principal, uint256 coupon) = vault.unlock(id);
        assertEq(principal, 2_500 * 1e6);
        assertGt(coupon, 0);
        assertEq(usdt.balanceOf(alice), startBal + principal + coupon);
        NortholdVault.Position memory pos = vault.positions(id);
        assertEq(pos.status, NortholdMath.STATUS_UNLOCKED);
        assertEq(card.ownerOf(id), alice);
    }

    function test_emergencyTakesFeeAndForfeitsCoupon() public {
        uint256 id = _mintUsdt(alice, pulseId, 1_000 * 1e6);
        vm.warp(block.timestamp + 10 days);
        uint256 claimable = vault.claimableOf(id);
        assertGt(claimable, 0);

        uint256 before = usdt.balanceOf(alice);
        vm.prank(alice);
        (uint256 returned, uint256 fee) = vault.emergencyExit(id);
        assertEq(fee, 150 * 1e6);
        assertEq(returned, 850 * 1e6);
        assertEq(usdt.balanceOf(alice) - before, returned);
        assertEq(vault.claimableOf(id), 0);
        assertEq(vault.protocolFees(address(usdt)), fee);
    }

    function test_emergencyAfterMaturityReverts() public {
        uint256 id = _mintUsdt(alice, pulseId, 1_000 * 1e6);
        vm.warp(block.timestamp + 30 days);
        vm.prank(alice);
        vm.expectRevert(NortholdVault.AlreadyMatured.selector);
        vault.emergencyExit(id);
    }

    function test_transferSellsTheSealedPosition() public {
        uint256 id = _mintUsdt(alice, pulseId, 1_000 * 1e6);
        vm.prank(alice);
        card.transferFrom(alice, bob, id);
        vm.warp(block.timestamp + 15 days);

        vm.prank(alice);
        vm.expectRevert(NortholdVault.NotCardOwner.selector);
        vault.claim(id);

        vm.prank(bob);
        (uint256 paid,) = vault.claim(id);
        assertGt(paid, 0);
        assertEq(usdt.balanceOf(bob), 1_000_000 * 1e6 + paid);
    }

    function test_referralPaidOnClaim() public {
        uint256 yearId = _yearPlan();
        vm.prank(alice);
        vault.setReferrer(referrer);
        uint256 id = _mintUsdt(alice, yearId, 1_000 * 1e6);
        vm.warp(block.timestamp + 31_557_600);
        vm.prank(alice);
        (uint256 paid, uint256 referralPaid) = vault.claim(id);
        assertEq(paid, 80 * 1e6);
        assertEq(referralPaid, 4 * 1e6);
        assertEq(usdt.balanceOf(referrer), 4 * 1e6);
    }

    function test_pauseDeposits() public {
        vm.prank(owner);
        vault.setDepositsPaused(true);
        vm.prank(alice);
        vm.expectRevert(NortholdVault.DepositsPaused.selector);
        vault.mint(address(usdt), pulseId, 1_000 * 1e6, address(0));
    }

    function test_rescueCannotPullLocked() public {
        vm.prank(alice);
        vault.mint(address(weth), horizonId, 1 ether, address(0));
        uint256 extra = vault.available(address(weth));
        vm.prank(owner);
        vm.expectRevert(NortholdVault.InsufficientAvailable.selector);
        vault.rescue(address(weth), extra + 1, owner);
    }

    function test_wethEarnsWeth() public {
        uint256 yearId = _yearPlan();
        vm.prank(alice);
        uint256 id = vault.mint(address(weth), yearId, 1 ether, address(0));
        vm.warp(block.timestamp + 31_557_600);
        uint256 before = weth.balanceOf(alice);
        vm.prank(alice);
        (uint256 paid,) = vault.claim(id);
        assertEq(paid, 0.08 ether);
        assertEq(weth.balanceOf(alice) - before, 0.08 ether);
    }

    function test_lensPositionsOf() public {
        _mintUsdt(alice, pulseId, 1_000 * 1e6);
        vm.prank(alice);
        vault.mint(address(weth), horizonId, 1 ether, address(0));
        NortholdLens.PositionView[] memory list = lens.positionsOf(alice);
        assertEq(list.length, 2);
        assertEq(list[0].owner, alice);
        assertTrue(list[1].principalUsd8 > 0);
    }

    function test_onlyOwnerAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setReferralBps(100);
    }
}
