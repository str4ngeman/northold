// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";

import {NortholdLens} from "../src/NortholdLens.sol";
import {NortholdOracle} from "../src/NortholdOracle.sol";
import {NortholdVault} from "../src/NortholdVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {PositionCard} from "../src/PositionCard.sol";

contract DeployLocal is Script {
    uint256 internal constant USD8 = 1e8;

    function run()
        external
        returns (
            NortholdVault vault,
            PositionCard card,
            NortholdOracle oracle,
            NortholdLens lens,
            MockERC20 usdt,
            MockERC20 usdc,
            MockERC20 weth,
            MockERC20 wbtc
        )
    {
        uint256 pk = vm.envOr(
            "PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address owner = vm.addr(pk);

        vm.startBroadcast(pk);

        usdt = new MockERC20("Tether USD", "USDT", 6);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        wbtc = new MockERC20("Wrapped Bitcoin", "WBTC", 8);

        oracle = new NortholdOracle(owner);
        card = new PositionCard(owner);
        vault = new NortholdVault(address(card), address(oracle), owner);
        lens = new NortholdLens(address(vault));

        card.setMinter(address(vault));

        oracle.setPrice(address(usdt), 1 * USD8);
        oracle.setPrice(address(usdc), 1 * USD8);
        oracle.setPrice(address(weth), 3_500 * USD8);
        oracle.setPrice(address(wbtc), 95_000 * USD8);

        vault.setAsset(address(usdt), true);
        vault.setAsset(address(usdc), true);
        vault.setAsset(address(weth), true);
        vault.setAsset(address(wbtc), true);

        vault.addPlan(
            NortholdVault.Plan({
                slug: bytes32("pulse"),
                lockSeconds: uint32(30 days),
                minUsd8: 100 * USD8,
                maxUsd8: 10_000 * USD8,
                apyBps: 800,
                emergencyFeeBps: 1500,
                active: true
            })
        );
        vault.addPlan(
            NortholdVault.Plan({
                slug: bytes32("horizon"),
                lockSeconds: uint32(90 days),
                minUsd8: 250 * USD8,
                maxUsd8: 25_000 * USD8,
                apyBps: 1200,
                emergencyFeeBps: 1200,
                active: true
            })
        );
        vault.addPlan(
            NortholdVault.Plan({
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
        usdc.mint(owner, 10_000_000 * 1e6);
        weth.mint(owner, 1_000 ether);
        wbtc.mint(owner, 50 * 1e8);
        usdt.approve(address(vault), type(uint256).max);
        usdc.approve(address(vault), type(uint256).max);
        weth.approve(address(vault), type(uint256).max);
        wbtc.approve(address(vault), type(uint256).max);
        vault.fundRewards(address(usdt), 5_000_000 * 1e6);
        vault.fundRewards(address(usdc), 5_000_000 * 1e6);
        vault.fundRewards(address(weth), 500 ether);
        vault.fundRewards(address(wbtc), 25 * 1e8);

        vm.stopBroadcast();
    }
}
