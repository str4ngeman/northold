// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IPriceOracle {
    /// @notice USD price with 8 decimals (Chainlink-style).
    function priceUsd(address asset) external view returns (uint256);
}
