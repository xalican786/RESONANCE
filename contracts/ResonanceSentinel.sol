// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ResonanceSentinel — alignment detector
// Monitors field for maximum resonance events
// Emits events that executor listens to

interface IResonanceField {
    function getScore() external view returns (uint8, uint8);
    function getAllDimensions() external view returns (uint8[10] memory);
}

contract ResonanceSentinel {
    address public immutable OPERATOR;
    address public immutable FIELD;

    uint256 public maxAlignmentFires;
    uint256 public partialAlignmentFires;
    uint256 public lastFireBlock;
    uint8   public lastScore;
    uint8   public lastMult;

    event ResonanceAligned(uint8 indexed score, uint8 multiplier, uint256 blockNum);
    event MaxResonance(uint256 indexed blockNum, uint8[10] dimensions);

    modifier onlyOperator() { require(msg.sender == OPERATOR, "RS: op"); _; }

    constructor(address _op, address _field) {
        OPERATOR = _op;
        FIELD    = _field;
    }

    function check() external returns (uint8 score, uint8 mult) {
        (score, mult) = IResonanceField(FIELD).getScore();
        lastScore = score;
        lastMult  = mult;

        if (score > 0) {
            lastFireBlock = block.number;
            if (score == 10) {
                maxAlignmentFires++;
                uint8[10] memory dims = IResonanceField(FIELD).getAllDimensions();
                emit MaxResonance(block.number, dims);
            } else {
                partialAlignmentFires++;
            }
            emit ResonanceAligned(score, mult, block.number);
        }
    }

    function getStatus() external view returns (
        uint8 score, uint8 mult, uint256 lastBlock,
        uint256 maxFires, uint256 partialFires
    ) {
        return (lastScore, lastMult, lastFireBlock, maxAlignmentFires, partialAlignmentFires);
    }
}
