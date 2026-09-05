// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ResonanceReserve — $100T reserve system
// COMPLETELY ISOLATED — only operator wallet can activate
// Cannot be called by any contract in the system
// 60-second timelock — activation is deliberate and irreversible per use
// Not part of normal operation or beyond imagination calculation
// Auto-disarms after single use

interface IResonanceAmplifier {
    function armReserve() external;
    function disarmReserve() external;
    function isReserveArmed() external view returns (bool);
}

contract ResonanceReserve {
    address public immutable OPERATOR;
    address public immutable AMPLIFIER;

    uint256 public constant RESERVE_CAP = 100_000_000_000_000;  // $100T in USD
    uint256 public constant TIMELOCK     = 60;                   // 60 seconds

    uint256 public activationTs;    // when operator initiated timelock
    bool    public timelockActive;  // timelock in progress
    uint256 public useCount;        // times reserve was activated
    uint256 public lastUseTs;

    event TimelockInitiated(address operator, uint256 eta);
    event ReserveArmed(uint256 cap, uint256 ts);
    event ReserveDisarmed(uint256 ts);
    event TimelockCancelled(uint256 ts);

    modifier onlyOperator() {
        // Direct wallet check — no contract intermediary allowed
        require(msg.sender == OPERATOR && msg.sender == tx.origin, "RR: direct wallet only");
        _;
    }

    constructor(address _op, address _amplifier) {
        OPERATOR  = _op;
        AMPLIFIER = _amplifier;
    }

    // Step 1: Initiate timelock — operator must call this first
    function initiateTimelock() external onlyOperator {
        require(!timelockActive, "RR: timelock already active");
        activationTs   = block.timestamp + TIMELOCK;
        timelockActive = true;
        emit TimelockInitiated(OPERATOR, activationTs);
    }

    // Step 2: After 60 seconds, arm the reserve
    function armReserve() external onlyOperator {
        require(timelockActive, "RR: initiate timelock first");
        require(block.timestamp >= activationTs, "RR: timelock not elapsed");
        timelockActive = false;
        useCount++;
        lastUseTs = block.timestamp;
        IResonanceAmplifier(AMPLIFIER).armReserve();
        emit ReserveArmed(RESERVE_CAP, block.timestamp);
    }

    // Cancel before timelock elapses
    function cancelTimelock() external onlyOperator {
        timelockActive = false;
        activationTs   = 0;
        emit TimelockCancelled(block.timestamp);
    }

    // Emergency disarm
    function disarm() external onlyOperator {
        IResonanceAmplifier(AMPLIFIER).disarmReserve();
        emit ReserveDisarmed(block.timestamp);
    }

    function getStatus() external view returns (
        bool armed, bool timelockPending, uint256 eta,
        uint256 uses, uint256 lastUse, uint256 cap
    ) {
        return (
            IResonanceAmplifier(AMPLIFIER).isReserveArmed(),
            timelockActive, activationTs,
            useCount, lastUseTs, RESERVE_CAP
        );
    }

    receive() external payable {}
}
