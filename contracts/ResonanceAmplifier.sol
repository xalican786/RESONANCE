// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ResonanceAmplifier — 25-layer compounding engine
// Base $70B → $5T standard output (25 layers at 1.18× each)
// Resonance score (1-10) applied as final multiplier
// Max output: $5T × 10 = $50T per cycle
// Reserve mode: adds $100T on top (operator-only, isolated)

contract ResonanceAmplifier {
    address public immutable OPERATOR;
    address public immutable RESONANCE;
    address public immutable RESERVE_LOCK;  // only contract that can trigger reserve

    uint256[25] public layerMults;
    uint256[25] public layerDivs;

    uint256 public totalAmplifications;
    bool    public reserveArmed = false;    // reserve activation flag

    event Amplified(uint256 indexed cycleId, uint256 input, uint256 output, uint8 resonance);
    event ReserveActivated(uint256 addedAmount, address operator);

    modifier onlyResonance() {
        require(msg.sender == RESONANCE || msg.sender == OPERATOR, "RA: auth");
        _;
    }
    modifier onlyOperator() { require(msg.sender == OPERATOR, "RA: op"); _; }

    constructor(address _op, address _resonance, address _reserveLock) {
        OPERATOR      = _op;
        RESONANCE     = _resonance;
        RESERVE_LOCK  = _reserveLock;

        // 25 layers — calibrated so $70B → $5T
        // $70B × 1.18^25 = $70B × 73.95 = $5,176.5B ≈ $5T
        for (uint256 i; i < 25; i++) {
            layerMults[i] = 1180;
            layerDivs[i]  = 1000;
        }
    }

    function amplify(
        uint256 base,
        uint256 cycleId,
        uint8   resonanceScore
    ) external onlyResonance returns (uint256 output) {
        output = base;

        // 25 sequential layers
        for (uint256 i; i < 25; i++) {
            output = (output * layerMults[i]) / layerDivs[i];
        }

        // Apply resonance multiplier (1-10)
        uint256 mult = resonanceScore > 0 ? resonanceScore : 1;
        if (mult > 10) mult = 10;
        output = output * mult;

        // Reserve bonus — only if armed by operator
        if (reserveArmed) {
            output += 100_000_000_000_000_000_000;  // $100T in USDC units (6 dec)
            reserveArmed = false;  // auto-disarm after one use
            emit ReserveActivated(100_000_000_000_000_000_000, OPERATOR);
        }

        totalAmplifications++;
        emit Amplified(cycleId, base, output, resonanceScore);
    }

    // Preview without executing
    function preview(uint256 base, uint8 resonanceScore)
        external view returns (uint256 output, uint256[25] memory layers)
    {
        output = base;
        for (uint256 i; i < 25; i++) {
            output = (output * layerMults[i]) / layerDivs[i];
            layers[i] = output;
        }
        output = output * (resonanceScore > 0 ? resonanceScore : 1);
    }

    function setLayerMult(uint256 idx, uint256 mult, uint256 div) external onlyOperator {
        require(idx < 25, "RA: idx");
        require(mult > div, "RA: must amplify");
        layerMults[idx] = mult;
        layerDivs[idx]  = div;
    }

    // Arm reserve — requires reserve lock contract authorization
    function armReserve() external {
        require(msg.sender == RESERVE_LOCK, "RA: only reserve lock");
        reserveArmed = true;
    }

    function disarmReserve() external onlyOperator { reserveArmed = false; }
    function isReserveArmed() external view returns (bool) { return reserveArmed; }
}
