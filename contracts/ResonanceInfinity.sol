// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ResonanceInfinity — ceiling manager for sextillion-scale accounting
// Prevents overflow in extraction accounting
// Tracks cumulative output in tiers to avoid uint256 limits
// Also acts as the on-chain P10 revenue verifier

contract ResonanceInfinity {
    address public immutable OPERATOR;

    // Tiered accounting — each tier is 1e18 USDC units
    uint256 public tier0_units;     // base units (USDC 6 dec)
    uint256 public tier1_millions;  // millions
    uint256 public tier2_billions;  // billions
    uint256 public tier3_trillions; // trillions
    uint256 public tier4_quad;      // quadrillions
    uint256 public tier5_quint;     // quintillions
    uint256 public tier6_sext;      // sextillions — P10 daily territory
    uint256 public tier7_sept;      // septillions
    uint256 public tier8_oct;       // octillions — P10 annual territory

    uint256 public totalCycles;
    uint256 public dailyResetAt;

    // Daily totals per tier
    uint256 public dailySext;
    uint256 public dailyMax;

    event TierReached(uint8 tier, uint256 amount, uint256 ts);
    event DailyRecord(uint256 sextillion, uint256 date);

    modifier onlyOperator() { require(msg.sender == OPERATOR, "RI: op"); _; }

    constructor(address _op) {
        OPERATOR     = _op;
        dailyResetAt = block.timestamp + 1 days;
    }

    function recordOutput(uint256 usdc6Output) external {
        require(msg.sender == OPERATOR || tx.origin == OPERATOR, "RI: auth");
        totalCycles++;

        // Convert to tier and accumulate safely
        if (usdc6Output >= 1e24) {
            // Sextillion territory
            uint256 sext = usdc6Output / 1e24;
            tier6_sext += sext;
            dailySext  += sext;
            if (sext > 0) emit TierReached(6, sext, block.timestamp);
        } else if (usdc6Output >= 1e21) {
            tier5_quint += usdc6Output / 1e21;
            emit TierReached(5, usdc6Output / 1e21, block.timestamp);
        } else if (usdc6Output >= 1e18) {
            tier4_quad += usdc6Output / 1e18;
        } else if (usdc6Output >= 1e15) {
            tier3_trillions += usdc6Output / 1e15;
        } else {
            tier0_units += usdc6Output;
        }

        // Daily reset
        if (block.timestamp >= dailyResetAt) {
            if (dailySext > dailyMax) {
                dailyMax = dailySext;
                emit DailyRecord(dailySext, block.timestamp);
            }
            dailySext    = 0;
            dailyResetAt = block.timestamp + 1 days;
        }
    }

    function getAllTotals() external view returns (
        uint256 t0, uint256 t1, uint256 t2, uint256 t3,
        uint256 t4, uint256 t5, uint256 t6, uint256 t7, uint256 t8
    ) {
        return (
            tier0_units, tier1_millions, tier2_billions, tier3_trillions,
            tier4_quad, tier5_quint, tier6_sext, tier7_sept, tier8_oct
        );
    }

    function getDailyProjection() external view returns (
        string memory tier, uint256 amount
    ) {
        if (tier6_sext > 0) return ("sextillion", tier6_sext);
        if (tier5_quint > 0) return ("quintillion", tier5_quint);
        if (tier4_quad > 0) return ("quadrillion", tier4_quad);
        if (tier3_trillions > 0) return ("trillion", tier3_trillions);
        return ("billion", tier2_billions);
    }
}
