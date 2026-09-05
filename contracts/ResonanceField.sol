// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ResonanceField — 10-dimension resonance scanner
// Reads field state and returns alignment score (0-10) + multiplier
// When all 10 dimensions align: score=10, multiplier=10×
// Updated by oracle every block

contract ResonanceField {
    address public immutable OPERATOR;
    address public immutable ORACLE;
    address public immutable SENTINEL;

    // 10 dimension scores — each 0-100
    uint8[10] public dimensionScores;
    uint8     public alignmentScore;    // 0-10 — how many dimensions are aligned
    uint8     public multiplier;        // 1-10
    uint256   public lastUpdate;
    uint256   public maxAlignmentEvents;

    // Dimension names (for reference)
    // D1: Temporal — price gaps persisting across blocks
    // D2: Spatial — cross-chain price discrepancies
    // D3: Depth — multi-tier liquidity imbalances
    // D4: Velocity — rate of price change differential
    // D5: Gravitational — large wallet position pressure
    // D6: Oracle — delay between oracle update and market price
    // D7: Block — MEV opportunity density within block
    // D8: Bridge — cross-chain transfer timing discrepancies
    // D9: Liquidation — positions approaching liquidation threshold
    // D10: Recursive — output of previous cycle feeding next

    uint8 public constant ALIGNMENT_THRESHOLD = 70;  // score >= 70 = aligned

    event FieldUpdated(uint8[10] scores, uint8 alignment, uint8 mult);
    event MaxAlignmentReached(uint256 indexed blockNumber);

    modifier onlyOracle() {
        require(msg.sender == ORACLE || msg.sender == OPERATOR, "RF: oracle");
        _;
    }
    modifier onlyOperator() { require(msg.sender == OPERATOR, "RF: op"); _; }

    constructor(address _op, address _oracle, address _sentinel) {
        OPERATOR  = _op;
        ORACLE    = _oracle;
        SENTINEL  = _sentinel;
        // Initialize all dimensions at 50
        for (uint256 i; i < 10; i++) dimensionScores[i] = 50;
        alignmentScore = 0;
        multiplier     = 1;
    }

    // Update field state — called by oracle every block
    function updateField(uint8[10] calldata scores) external onlyOracle {
        uint8 aligned = 0;
        for (uint256 i; i < 10; i++) {
            dimensionScores[i] = scores[i] > 100 ? 100 : scores[i];
            if (scores[i] >= ALIGNMENT_THRESHOLD) aligned++;
        }
        alignmentScore = aligned;
        multiplier     = aligned > 0 ? aligned : 1;
        lastUpdate     = block.timestamp;

        if (aligned == 10) {
            maxAlignmentEvents++;
            emit MaxAlignmentReached(block.number);
        }

        emit FieldUpdated(scores, aligned, multiplier);
    }

    function getScore() external view returns (uint8 score, uint8 mult) {
        return (alignmentScore, multiplier);
    }

    function getAllDimensions() external view returns (uint8[10] memory scores) {
        return dimensionScores;
    }

    function setThresholdManual(uint8[10] calldata scores) external onlyOperator {
        for (uint256 i; i < 10; i++) dimensionScores[i] = scores[i];
    }
}
