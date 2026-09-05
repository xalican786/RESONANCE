// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ShadowProxy — Sovereign Shadow Protocol Layer 1
// Address rotation: every treasury transfer routes through a one-time wallet
// Amount fragmentation: large amounts split into micro-transactions
// Cross-chain routing: funds hop across chains before reaching treasury
// Temporal dispersion: fragments delivered across multiple blocks
// This contract is the entry point to the cloak layer

interface IERC20 {
    function transfer(address,uint256) external returns(bool);
    function balanceOf(address) external view returns(uint256);
    function approve(address,uint256) external returns(bool);
    function transferFrom(address,address,uint256) external returns(bool);
}

interface IShadowRouter {
    function initRoute(address token, uint256 amount, uint256 fragments) external returns (bytes32 routeId);
}

contract ShadowProxy {
    address public immutable OPERATOR;
    address public immutable TREASURY;
    address public immutable ROUTER;

    // Fragment size threshold — amounts above this are fragmented
    uint256 public fragmentThreshold = 1_000_000 * 1e6;  // $1M USDC

    // Routing stats (no individual amounts stored — privacy)
    uint256 public totalRouteCount;
    uint256 public totalFragments;
    bool    public shadowActive = true;

    event RouteInitiated(bytes32 routeId, uint256 fragments);
    event DirectRouted(address treasury);  // no amount in event

    modifier onlyResonance() {
        require(shadowActive, "SP: shadow off");
        _;
    }

    constructor(address _op, address _treasury, address _router) {
        OPERATOR  = _op;
        TREASURY  = _treasury;
        ROUTER    = _router;
    }

    function route(address token, uint256 amount) external returns (bool) {
        if (!shadowActive || amount == 0) {
            IERC20(token).transferFrom(msg.sender, TREASURY, amount);
            emit DirectRouted(TREASURY);
            return true;
        }

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        uint256 fragments = amount > fragmentThreshold
            ? (amount / fragmentThreshold) + 1
            : 1;

        // Cap fragments at 100 — prevents gas limit issues
        if (fragments > 100) fragments = 100;

        totalRouteCount++;
        totalFragments += fragments;

        if (fragments == 1 || ROUTER == address(0)) {
            // Direct to treasury (small amount)
            IERC20(token).transfer(TREASURY, amount);
            emit DirectRouted(TREASURY);
        } else {
            // Route through shadow router for fragmentation
            IERC20(token).approve(ROUTER, amount);
            bytes32 routeId = IShadowRouter(ROUTER).initRoute(token, amount, fragments);
            emit RouteInitiated(routeId, fragments);
        }

        return true;
    }

    function setShadowActive(bool active) external {
        require(msg.sender == OPERATOR, "SP: op");
        shadowActive = active;
    }

    function setFragmentThreshold(uint256 threshold) external {
        require(msg.sender == OPERATOR, "SP: op");
        fragmentThreshold = threshold;
    }

    function emergencySweep(address token) external {
        require(msg.sender == OPERATOR, "SP: op");
        uint256 b = IERC20(token).balanceOf(address(this));
        if (b > 0) IERC20(token).transfer(TREASURY, b);
    }

    receive() external payable {}
}
