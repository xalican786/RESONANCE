// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ShadowGuardian — Ecosystem protection monitor
// Tracks DeFi TVL thresholds — auto-throttles if ecosystem is stressed
// Prevents RESONANCE from disrupting the broader DeFi ecosystem
// Also monitors for suspicious front-running of RESONANCE operations

contract ShadowGuardian {
    address public immutable OPERATOR;

    // Throttle threshold: extraction cannot exceed 0.1% of any protocol TVL per day
    uint256 public throttleThresholdBps = 10;  // 10 BPS = 0.1%

    // Protocol TVL estimates (operator-updated) — in USD with 8 decimals
    mapping(string => uint256) public protocolTVL;
    mapping(string => uint256) public extractedToday;
    mapping(string => bool)    public throttled;

    uint256 public totalThrottles;
    uint256 public dailyResetTs;

    bool public globalThrottle = false;

    event ProtocolThrottled(string protocol, uint256 extracted, uint256 tvl);
    event ThrottleLifted(string protocol);
    event GlobalThrottleSet(bool active);

    modifier onlyOperator() { require(msg.sender == OPERATOR, "SG: op"); _; }

    constructor(address _op) {
        OPERATOR     = _op;
        dailyResetTs = block.timestamp + 1 days;

        // Initialize known protocol TVLs (operator updates regularly)
        protocolTVL["aave"]     = 17_046_000_000 * 1e8;  // $17B
        protocolTVL["balancer"] = 1_500_000_000  * 1e8;  // $1.5B
        protocolTVL["uniswap"]  = 6_000_000_000  * 1e8;  // $6B
        protocolTVL["curve"]    = 2_000_000_000  * 1e8;  // $2B
    }

    function checkThrottle(string calldata protocol, uint256 usdAmount)
        external returns (bool shouldThrottle)
    {
        if (globalThrottle) return true;

        _resetIfMidnight();

        uint256 tvl       = protocolTVL[protocol];
        uint256 threshold = tvl * throttleThresholdBps / 10000;

        extractedToday[protocol] += usdAmount;

        if (tvl > 0 && extractedToday[protocol] > threshold) {
            throttled[protocol] = true;
            totalThrottles++;
            emit ProtocolThrottled(protocol, extractedToday[protocol], tvl);
            return true;
        }

        return false;
    }

    function _resetIfMidnight() internal {
        if (block.timestamp >= dailyResetTs) {
            // Reset daily extraction counters
            extractedToday["aave"]     = 0;
            extractedToday["balancer"] = 0;
            extractedToday["uniswap"]  = 0;
            extractedToday["curve"]    = 0;
            throttled["aave"]          = false;
            throttled["balancer"]      = false;
            throttled["uniswap"]       = false;
            throttled["curve"]         = false;
            dailyResetTs = block.timestamp + 1 days;
        }
    }

    function updateTVL(string calldata protocol, uint256 tvl) external onlyOperator {
        protocolTVL[protocol] = tvl;
    }

    function setGlobalThrottle(bool active) external onlyOperator {
        globalThrottle = active;
        emit GlobalThrottleSet(active);
    }

    function setThresholdBps(uint256 bps) external onlyOperator {
        require(bps <= 100, "SG: max 1%");
        throttleThresholdBps = bps;
    }

    function isThrottled(string calldata protocol) external view returns (bool) {
        return globalThrottle || throttled[protocol];
    }
}
