// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ILeagueVault} from "./interfaces/ILeagueVault.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {LeagueMath} from "./libraries/LeagueMath.sol";
import {PositionCard} from "./PositionCard.sol";

/// @title LeagueVault
/// @notice Lock an ERC-20, mint a numbered position NFT, accrue a USDT coupon in open time.
///         Principal returns in the same tokens when the seal completes.
contract LeagueVault is ILeagueVault, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Plan {
        bytes32 slug;
        uint32 lockSeconds;
        uint256 minUsd8;
        uint256 maxUsd8;
        uint16 apyBps;
        uint16 emergencyFeeBps;
        bool active;
    }

    struct Asset {
        bool configured;
        bool active;
        uint8 decimals;
    }

    struct Position {
        address asset;
        uint256 principal;
        uint256 principalUsd8;
        uint256 planId;
        uint64 startedAt;
        uint64 unlockedAt;
        uint256 claimedReward;
        uint32 lockSeconds;
        uint16 apyBps;
        uint16 emergencyFeeBps;
        uint8 rarity;
        uint8 sizeTier;
        uint8 status;
    }

    PositionCard public immutable card;
    IERC20 public immutable reward;
    uint8 public immutable rewardDecimals;
    IPriceOracle public oracle;

    uint16 public referralBps = 500;
    bool public depositsPaused;
    bool public exitsPaused;

    uint256 public planCount;
    uint256 public nextTokenId = 1;

    mapping(uint256 => Plan) internal _plans;
    mapping(address => Asset) internal _assets;
    mapping(uint256 => Position) internal _positions;
    mapping(address => address) public referrerOf;
    mapping(address => uint256) public protocolFees;
    mapping(address => uint256) public lockedPrincipal;

    error DepositsPaused();
    error ExitsPaused();
    error UnknownPlan();
    error InactivePlan();
    error UnknownAsset();
    error InactiveAsset();
    error AmountOutOfRange();
    error NotCardOwner();
    error NotLocked();
    error StillLocked();
    error AlreadyMatured();
    error NothingToClaim();
    error SelfReferral();
    error ReferrerAlreadySet();
    error InvalidBps();
    error InsufficientAvailable();

    event Minted(
        uint256 indexed tokenId,
        address indexed owner,
        address indexed asset,
        uint256 planId,
        uint256 amount,
        uint256 principalUsd8,
        uint8 rarity,
        uint8 sizeTier
    );
    event Claimed(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 paid,
        uint256 referralPaid,
        address referrer
    );
    event Unlocked(uint256 indexed tokenId, address indexed owner, uint256 principal, uint256 rewardPaid);
    event EmergencyExited(
        uint256 indexed tokenId, address indexed owner, uint256 returnedAmount, uint256 fee
    );
    event ReferrerSet(address indexed user, address indexed referrer);
    event PlanAdded(uint256 indexed planId, bytes32 slug);
    event PlanUpdated(uint256 indexed planId);
    event AssetSet(address indexed token, bool active, uint8 decimals);
    event OracleSet(address indexed oracle);
    event ReferralBpsSet(uint16 bps);
    event DepositsPauseSet(bool paused);
    event ExitsPauseSet(bool paused);
    event RewardsFunded(address indexed from, uint256 amount);
    event FeesWithdrawn(address indexed token, address indexed to, uint256 amount);
    event Rescued(address indexed token, address indexed to, uint256 amount);

    modifier onlyCardOwner(uint256 tokenId) {
        if (card.ownerOf(tokenId) != msg.sender) revert NotCardOwner();
        _;
    }

    constructor(address card_, address reward_, address oracle_, address owner_) Ownable(owner_) {
        card = PositionCard(card_);
        reward = IERC20(reward_);
        rewardDecimals = IERC20Metadata(reward_).decimals();
        oracle = IPriceOracle(oracle_);
    }

    // ─── User ────────────────────────────────────────────────────────────────

    function mint(address asset, uint256 planId, uint256 amount, address referrer)
        external
        nonReentrant
        returns (uint256 tokenId)
    {
        if (depositsPaused) revert DepositsPaused();

        Plan memory plan = _plans[planId];
        if (plan.lockSeconds == 0) revert UnknownPlan();
        if (!plan.active) revert InactivePlan();

        Asset memory a = _assets[asset];
        if (!a.configured) revert UnknownAsset();
        if (!a.active) revert InactiveAsset();

        uint256 usd8 = LeagueMath.principalUsd8(amount, a.decimals, oracle.priceUsd(asset));
        if (usd8 < plan.minUsd8 || usd8 > plan.maxUsd8) revert AmountOutOfRange();

        if (referrer != address(0)) {
            _setReferrer(msg.sender, referrer);
        }

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        lockedPrincipal[asset] += amount;

        tokenId = nextTokenId++;
        uint8 size = LeagueMath.sizeTier(usd8);
        uint8 rar = LeagueMath.rarity(plan.lockSeconds, usd8);

        _positions[tokenId] = Position({
            asset: asset,
            principal: amount,
            principalUsd8: usd8,
            planId: planId,
            startedAt: uint64(block.timestamp),
            unlockedAt: 0,
            claimedReward: 0,
            lockSeconds: plan.lockSeconds,
            apyBps: plan.apyBps,
            emergencyFeeBps: plan.emergencyFeeBps,
            rarity: rar,
            sizeTier: size,
            status: LeagueMath.STATUS_LOCKED
        });

        card.mint(msg.sender, tokenId);
        emit Minted(tokenId, msg.sender, asset, planId, amount, usd8, rar, size);
    }

    function claim(uint256 tokenId)
        external
        nonReentrant
        onlyCardOwner(tokenId)
        returns (uint256 paid, uint256 referralPaid)
    {
        Position storage pos = _positions[tokenId];
        if (pos.status != LeagueMath.STATUS_LOCKED) revert NotLocked();

        paid = _claimable(pos);
        if (paid == 0) revert NothingToClaim();

        pos.claimedReward += paid;

        address ref = referrerOf[msg.sender];
        if (ref != address(0) && referralBps > 0) {
            referralPaid = (paid * referralBps) / LeagueMath.BPS;
        }

        reward.safeTransfer(msg.sender, paid);
        if (referralPaid > 0) {
            reward.safeTransfer(ref, referralPaid);
        }

        emit Claimed(tokenId, msg.sender, paid, referralPaid, ref);
    }

    function unlock(uint256 tokenId)
        external
        nonReentrant
        onlyCardOwner(tokenId)
        returns (uint256 principal, uint256 rewardPaid)
    {
        if (exitsPaused) revert ExitsPaused();
        Position storage pos = _positions[tokenId];
        if (pos.status != LeagueMath.STATUS_LOCKED) revert NotLocked();
        if (block.timestamp < uint256(pos.startedAt) + pos.lockSeconds) revert StillLocked();

        rewardPaid = _claimable(pos);
        principal = pos.principal;

        pos.claimedReward += rewardPaid;
        pos.status = LeagueMath.STATUS_UNLOCKED;
        pos.unlockedAt = uint64(block.timestamp);
        lockedPrincipal[pos.asset] -= principal;

        IERC20(pos.asset).safeTransfer(msg.sender, principal);
        if (rewardPaid > 0) {
            address ref = referrerOf[msg.sender];
            uint256 referralPaid;
            if (ref != address(0) && referralBps > 0) {
                referralPaid = (rewardPaid * referralBps) / LeagueMath.BPS;
            }
            reward.safeTransfer(msg.sender, rewardPaid);
            if (referralPaid > 0) reward.safeTransfer(ref, referralPaid);
        }

        emit Unlocked(tokenId, msg.sender, principal, rewardPaid);
    }

    function emergencyExit(uint256 tokenId)
        external
        nonReentrant
        onlyCardOwner(tokenId)
        returns (uint256 returnedAmount, uint256 fee)
    {
        if (exitsPaused) revert ExitsPaused();
        Position storage pos = _positions[tokenId];
        if (pos.status != LeagueMath.STATUS_LOCKED) revert NotLocked();
        if (block.timestamp >= uint256(pos.startedAt) + pos.lockSeconds) revert AlreadyMatured();

        fee = LeagueMath.emergencyFee(pos.principal, pos.emergencyFeeBps);
        returnedAmount = pos.principal - fee;

        pos.status = LeagueMath.STATUS_EMERGENCY;
        pos.unlockedAt = uint64(block.timestamp);
        lockedPrincipal[pos.asset] -= pos.principal;
        protocolFees[pos.asset] += fee;

        if (returnedAmount > 0) {
            IERC20(pos.asset).safeTransfer(msg.sender, returnedAmount);
        }

        emit EmergencyExited(tokenId, msg.sender, returnedAmount, fee);
    }

    function setReferrer(address referrer) external {
        _setReferrer(msg.sender, referrer);
    }

    // ─── Views ───────────────────────────────────────────────────────────────

    function plans(uint256 planId) external view returns (Plan memory) {
        return _plans[planId];
    }

    function assets(address token) external view returns (Asset memory) {
        return _assets[token];
    }

    function positions(uint256 tokenId) external view returns (Position memory) {
        return _positions[tokenId];
    }

    function accruedOf(uint256 tokenId) public view returns (uint256) {
        Position storage pos = _positions[tokenId];
        return LeagueMath.accruedReward(
            pos.principalUsd8, pos.apyBps, _elapsed(pos), rewardDecimals
        );
    }

    function claimableOf(uint256 tokenId) public view returns (uint256) {
        return _claimable(_positions[tokenId]);
    }

    function isMatured(uint256 tokenId) public view returns (bool) {
        Position storage pos = _positions[tokenId];
        if (pos.status != LeagueMath.STATUS_LOCKED) return false;
        return block.timestamp >= uint256(pos.startedAt) + pos.lockSeconds;
    }

    function unlockAt(uint256 tokenId) public view returns (uint64) {
        Position storage pos = _positions[tokenId];
        return pos.startedAt + pos.lockSeconds;
    }

    function previewMint(address asset, uint256 planId, uint256 amount)
        external
        view
        returns (uint256 usd8, uint8 rar, uint8 size, bool inRange)
    {
        Plan memory plan = _plans[planId];
        Asset memory a = _assets[asset];
        usd8 = LeagueMath.principalUsd8(amount, a.decimals, oracle.priceUsd(asset));
        rar = LeagueMath.rarity(plan.lockSeconds, usd8);
        size = LeagueMath.sizeTier(usd8);
        inRange = plan.active && a.active && usd8 >= plan.minUsd8 && usd8 <= plan.maxUsd8;
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function addPlan(Plan calldata plan) external onlyOwner returns (uint256 planId) {
        planId = ++planCount;
        _plans[planId] = plan;
        emit PlanAdded(planId, plan.slug);
    }

    function updatePlan(uint256 planId, Plan calldata plan) external onlyOwner {
        if (_plans[planId].lockSeconds == 0) revert UnknownPlan();
        _plans[planId] = plan;
        emit PlanUpdated(planId);
    }

    function setAsset(address token, bool active) external onlyOwner {
        uint8 decimals_ = IERC20Metadata(token).decimals();
        _assets[token] = Asset({configured: true, active: active, decimals: decimals_});
        emit AssetSet(token, active, decimals_);
    }

    function setOracle(address oracle_) external onlyOwner {
        oracle = IPriceOracle(oracle_);
        emit OracleSet(oracle_);
    }

    function setReferralBps(uint16 bps) external onlyOwner {
        if (bps > 2_000) revert InvalidBps();
        referralBps = bps;
        emit ReferralBpsSet(bps);
    }

    function setDepositsPaused(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPauseSet(paused);
    }

    function setExitsPaused(bool paused) external onlyOwner {
        exitsPaused = paused;
        emit ExitsPauseSet(paused);
    }

    function fundRewards(uint256 amount) external {
        reward.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsFunded(msg.sender, amount);
    }

    function withdrawFees(address token, uint256 amount, address to) external onlyOwner {
        protocolFees[token] -= amount;
        IERC20(token).safeTransfer(to, amount);
        emit FeesWithdrawn(token, to, amount);
    }

    /// @notice Pull idle tokens. Cannot touch locked principal or accrued protocol fees.
    function rescue(address token, uint256 amount, address to) external onlyOwner {
        uint256 reserved = lockedPrincipal[token] + protocolFees[token];
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (amount > bal - reserved) revert InsufficientAvailable();
        IERC20(token).safeTransfer(to, amount);
        emit Rescued(token, to, amount);
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _elapsed(Position storage pos) internal view returns (uint256) {
        uint256 cap = uint256(pos.startedAt) + pos.lockSeconds;
        uint256 stop = block.timestamp;
        if (pos.status != LeagueMath.STATUS_LOCKED) {
            stop = pos.unlockedAt;
        }
        if (stop > cap) stop = cap;
        if (stop <= pos.startedAt) return 0;
        return stop - pos.startedAt;
    }

    function _claimable(Position storage pos) internal view returns (uint256) {
        uint256 accrued = LeagueMath.accruedReward(
            pos.principalUsd8, pos.apyBps, _elapsed(pos), rewardDecimals
        );
        return LeagueMath.claimable(accrued, pos.claimedReward, pos.status);
    }

    function _setReferrer(address user, address referrer) internal {
        if (referrer == user) revert SelfReferral();
        if (referrer == address(0)) revert SelfReferral();
        if (referrerOf[user] != address(0)) revert ReferrerAlreadySet();
        referrerOf[user] = referrer;
        emit ReferrerSet(user, referrer);
    }
}
