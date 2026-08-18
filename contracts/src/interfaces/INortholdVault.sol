// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface INortholdVault {
    function mint(address asset, uint256 planId, uint256 amount, address referrer)
        external
        returns (uint256 tokenId);

    function claim(uint256 tokenId) external returns (uint256 paid, uint256 referralPaid);

    function unlock(uint256 tokenId) external returns (uint256 principal, uint256 rewardPaid);

    function emergencyExit(uint256 tokenId)
        external
        returns (uint256 returnedAmount, uint256 fee);
}
