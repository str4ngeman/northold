// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IPriceOracle} from "./interfaces/IPriceOracle.sol";

/// @title LeagueOracle
/// @notice Admin-set USD prices (8 decimals). Swap later for a Chainlink adapter.
contract LeagueOracle is IPriceOracle, Ownable {
    mapping(address => uint256) private _priceUsd8;

    error UnknownAsset(address asset);

    event PriceSet(address indexed asset, uint256 priceUsd8);

    constructor(address owner_) Ownable(owner_) {}

    function setPrice(address asset, uint256 priceUsd8) external onlyOwner {
        _priceUsd8[asset] = priceUsd8;
        emit PriceSet(asset, priceUsd8);
    }

    function setPrices(address[] calldata tokens, uint256[] calldata prices) external onlyOwner {
        uint256 n = tokens.length;
        require(n == prices.length, "length");
        for (uint256 i; i < n; ++i) {
            _priceUsd8[tokens[i]] = prices[i];
            emit PriceSet(tokens[i], prices[i]);
        }
    }

    function priceUsd(address asset) external view returns (uint256) {
        uint256 price = _priceUsd8[asset];
        if (price == 0) revert UnknownAsset(asset);
        return price;
    }
}
