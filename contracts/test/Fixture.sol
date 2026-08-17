// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {LeagueLens} from "../src/LeagueLens.sol";
import {LeagueOracle} from "../src/LeagueOracle.sol";
import {LeagueVault} from "../src/LeagueVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {PositionCard} from "../src/PositionCard.sol";

contract Fixture is Test {
    uint256 internal constant USD8 = 1e8;

    LeagueVault internal vault;
    PositionCard internal card;
    LeagueOracle internal oracle;
    LeagueLens internal lens;
    MockERC20 internal usdt;
    MockERC20 internal usdc;
    MockERC20 internal weth;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal referrer = makeAddr("referrer");

    uint256 internal pulseId;
    uint256 internal horizonId;
    uint256 internal apexId;

    function setUp() public virtual {
        vm.startPrank(owner);
        usdt = new MockERC20("Tether USD", "USDT", 6);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        oracle = new LeagueOracle(owner);
        card = new PositionCard(owner);
        vault = new LeagueVault(address(card), address(usdt), address(oracle), owner);
        lens = new LeagueLens(address(vault));
        card.setMinter(address(vault));

        oracle.setPrice(address(usdt), 1 * USD8);
        oracle.setPrice(address(usdc), 1 * USD8);
        oracle.setPrice(address(weth), 3_500 * USD8);

        vault.setAsset(address(usdt), true);
        vault.setAsset(address(usdc), true);
        vault.setAsset(address(weth), true);

        pulseId = vault.addPlan(
            LeagueVault.Plan({
                slug: bytes32("pulse"),
                lockSeconds: uint32(30 days),
                minUsd8: 100 * USD8,
                maxUsd8: 10_000 * USD8,
                apyBps: 800,
                emergencyFeeBps: 1500,
                active: true
            })
        );
        horizonId = vault.addPlan(
            LeagueVault.Plan({
                slug: bytes32("horizon"),
                lockSeconds: uint32(90 days),
                minUsd8: 250 * USD8,
                maxUsd8: 25_000 * USD8,
                apyBps: 1200,
                emergencyFeeBps: 1200,
                active: true
            })
        );
        apexId = vault.addPlan(
            LeagueVault.Plan({
                slug: bytes32("apex"),
                lockSeconds: uint32(180 days),
                minUsd8: 500 * USD8,
                maxUsd8: 50_000 * USD8,
                apyBps: 1800,
                emergencyFeeBps: 1000,
                active: true
            })
        );

        usdt.mint(owner, 10_000_000 * 1e6);
        usdt.approve(address(vault), type(uint256).max);
        vault.fundRewards(5_000_000 * 1e6);
        vm.stopPrank();

        usdt.mint(alice, 1_000_000 * 1e6);
        usdc.mint(alice, 1_000_000 * 1e6);
        weth.mint(alice, 100 ether);
        usdt.mint(bob, 1_000_000 * 1e6);

        vm.prank(alice);
        usdt.approve(address(vault), type(uint256).max);
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(alice);
        weth.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(vault), type(uint256).max);
    }

    function _mintUsdt(address user, uint256 planId, uint256 amount) internal returns (uint256 tokenId) {
        vm.prank(user);
        tokenId = vault.mint(address(usdt), planId, amount, address(0));
    }

    function _yearPlan() internal returns (uint256 planId) {
        vm.prank(owner);
        planId = vault.addPlan(
            LeagueVault.Plan({
                slug: bytes32("year"),
                lockSeconds: uint32(31_557_600),
                minUsd8: 100 * USD8,
                maxUsd8: 1_000_000 * USD8,
                apyBps: 800,
                emergencyFeeBps: 1500,
                active: true
            })
        );
    }
}
