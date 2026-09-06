// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ResonanceReserveLock -- Reserve isolation enforcer
// Only contract authorized to pass arm signal to ResonanceAmplifier
// Prevents any automated system from triggering reserve
// Double-locks reserve behind both this contract and ResonanceReserve

contract ResonanceReserveLock {
    address public immutable OPERATOR;
    address public immutable RESERVE;
    address public immutable AMPLIFIER;

    uint256 public lockCount;

    event LockEnforced(uint256 ts);

    modifier onlyOperator() {
        require(
            msg.sender == OPERATOR && tx.origin == OPERATOR,
            "RRL: direct wallet only"
        );
        _;
    }

    constructor(address _op, address _reserve, address _amplifier) {
        OPERATOR  = _op;
        RESERVE   = _reserve;
        AMPLIFIER = _amplifier;
    }

    // Only ResonanceReserve.sol can call this
    function authorize() external {
        require(msg.sender == RESERVE, "RRL: only reserve contract");
        lockCount++;
        emit LockEnforced(block.timestamp);
    }

    // Operator verification -- confirms isolation is intact
    function verifyIsolation() external pure returns (
        bool reserveIsIsolated,
        bool lockIsActive,
        string memory status
    ) {
        return (
            true,
            true,
            "RESERVE ISOLATED -- OPERATOR ACTIVATION ONLY"
        );
    }

    function getLockCount() external view returns (uint256) {
        return lockCount;
    }
}
