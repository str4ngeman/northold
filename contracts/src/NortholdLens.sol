// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {NortholdMath} from "./libraries/NortholdMath.sol";
import {NortholdVault} from "./NortholdVault.sol";
import {PositionCard} from "./PositionCard.sol";

/// @title NortholdLens
/// @notice Batch reads for the CLI: wallet analysis, monitoring, simulations.
contract NortholdLens {
    struct PositionView {
        uint256 tokenId;
        address owner;
        address asset;
        uint256 principal;
        uint256 principalUsd8;
        uint256 planId;
        bytes32 planSlug;
        uint64 startedAt;
        uint64 unlockAt;
        uint64 unlockedAt;
        uint256 accruedReward;
        uint256 claimedReward;
        uint256 claimableReward;
        uint32 lockSeconds;
        uint16 apyBps;
        uint16 emergencyFeeBps;
        uint8 rarity;
        uint8 sizeTier;
        uint8 status;
        uint256 lockProgressBps;
        bool matured;
    }

    struct VaultSnapshot {
        uint256 nextTokenId;
        uint256 planCount;
        uint16 referralBps;
        bool depositsPaused;
        bool exitsPaused;
        address card;
        address oracle;
    }

    NortholdVault public immutable vault;
    PositionCard public immutable card;

    constructor(address vault_) {
        vault = NortholdVault(vault_);
        card = vault.card();
    }

    function snapshot() external view returns (VaultSnapshot memory s) {
        s.nextTokenId = vault.nextTokenId();
        s.planCount = vault.planCount();
        s.referralBps = vault.referralBps();
        s.depositsPaused = vault.depositsPaused();
        s.exitsPaused = vault.exitsPaused();
        s.card = address(card);
        s.oracle = address(vault.oracle());
    }

    function positionView(uint256 tokenId) public view returns (PositionView memory v) {
        NortholdVault.Position memory pos = vault.positions(tokenId);
        v.tokenId = tokenId;
        if (pos.startedAt == 0) return v;
        v.owner = card.ownerOf(tokenId);
        v.asset = pos.asset;
        v.principal = pos.principal;
        v.principalUsd8 = pos.principalUsd8;
        v.planId = pos.planId;
        v.planSlug = vault.plans(pos.planId).slug;
        v.startedAt = pos.startedAt;
        v.unlockAt = pos.startedAt + pos.lockSeconds;
        v.unlockedAt = pos.unlockedAt;
        v.accruedReward = vault.accruedOf(tokenId);
        v.claimedReward = pos.claimedReward;
        v.claimableReward = vault.claimableOf(tokenId);
        v.lockSeconds = pos.lockSeconds;
        v.apyBps = pos.apyBps;
        v.emergencyFeeBps = pos.emergencyFeeBps;
        v.rarity = pos.rarity;
        v.sizeTier = pos.sizeTier;
        v.status = pos.status;
        v.lockProgressBps =
            NortholdMath.lockProgressBps(pos.startedAt, pos.lockSeconds, uint64(block.timestamp));
        v.matured = vault.isMatured(tokenId);
    }

    function positionsOf(address user) external view returns (PositionView[] memory list) {
        uint256 n = card.balanceOf(user);
        list = new PositionView[](n);
        for (uint256 i; i < n; ++i) {
            list[i] = positionView(card.tokenOfOwnerByIndex(user, i));
        }
    }

    function tvlUsd8(address[] calldata tokens) external view returns (uint256 total, uint256[] memory perToken) {
        perToken = new uint256[](tokens.length);
        for (uint256 i; i < tokens.length; ++i) {
            uint256 locked = vault.lockedPrincipal(tokens[i]);
            NortholdVault.Asset memory a = vault.assets(tokens[i]);
            if (!a.configured || locked == 0) continue;
            uint256 price = vault.oracle().priceUsd(tokens[i]);
            perToken[i] = NortholdMath.principalUsd8(locked, a.decimals, price);
            total += perToken[i];
        }
    }
}
