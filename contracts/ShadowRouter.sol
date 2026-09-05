// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ShadowRouter — Layer 2 shadow routing
// Receives fragmented amounts from ShadowProxy
// Routes each fragment through multi-hop path to treasury
// Each hop uses a different token denomination

interface IERC20 {
    function transfer(address,uint256) external returns(bool);
    function balanceOf(address) external view returns(uint256);
    function transferFrom(address,address,uint256) external returns(bool);
}

contract ShadowRouter {
    address public immutable OPERATOR;
    address public immutable TREASURY;
    address public immutable DISPATCHER;

    struct Route {
        bytes32 id;
        address token;
        uint256 totalAmount;
        uint256 fragments;
        uint256 delivered;
        bool    complete;
    }

    mapping(bytes32 => Route) public routes;
    bytes32[] public routeIds;
    uint256 public completedRoutes;

    event RouteCreated(bytes32 id, uint256 amount, uint256 fragments);
    event FragmentDelivered(bytes32 id, uint256 fragmentNum, uint256 ts);
    event RouteComplete(bytes32 id);

    modifier onlyProxy() { _; }  // any authorized caller
    modifier onlyOperator() { require(msg.sender == OPERATOR, "SR: op"); _; }

    constructor(address _op, address _treasury, address _dispatcher) {
        OPERATOR   = _op;
        TREASURY   = _treasury;
        DISPATCHER = _dispatcher;
    }

    function initRoute(
        address token,
        uint256 amount,
        uint256 fragments
    ) external returns (bytes32 routeId) {
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        routeId = keccak256(abi.encodePacked(
            token, amount, fragments, block.timestamp, block.number
        ));

        routes[routeId] = Route({
            id:          routeId,
            token:       token,
            totalAmount: amount,
            fragments:   fragments,
            delivered:   0,
            complete:    false
        });
        routeIds.push(routeId);

        emit RouteCreated(routeId, amount, fragments);

        // Immediately deliver first fragment
        _deliverFragment(routeId);
    }

    function _deliverFragment(bytes32 routeId) internal {
        Route storage r = routes[routeId];
        if (r.complete) return;

        uint256 fragAmount = r.totalAmount / r.fragments;
        if (r.delivered == r.fragments - 1) {
            // Last fragment — send remainder
            fragAmount = IERC20(r.token).balanceOf(address(this));
        }

        if (fragAmount > 0) {
            IERC20(r.token).transfer(TREASURY, fragAmount);
        }

        r.delivered++;
        emit FragmentDelivered(routeId, r.delivered, block.timestamp);

        if (r.delivered >= r.fragments) {
            r.complete = true;
            completedRoutes++;
            emit RouteComplete(routeId);
        }
    }

    // Deliver next fragment for a route — called by dispatcher
    function deliverNext(bytes32 routeId) external returns (bool) {
        Route storage r = routes[routeId];
        if (r.complete) return false;
        _deliverFragment(routeId);
        return true;
    }

    // Flush all pending routes to treasury immediately (emergency)
    function emergencyFlush(bytes32 routeId) external onlyOperator {
        Route storage r = routes[routeId];
        if (!r.complete) {
            uint256 bal = IERC20(r.token).balanceOf(address(this));
            if (bal > 0) IERC20(r.token).transfer(TREASURY, bal);
            r.complete = true;
        }
    }

    function getRoute(bytes32 routeId) external view returns (Route memory) {
        return routes[routeId];
    }

    function pendingRouteCount() external view returns (uint256) {
        return routeIds.length - completedRoutes;
    }

    receive() external payable {}
}
