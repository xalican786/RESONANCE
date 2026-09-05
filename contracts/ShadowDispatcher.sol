// contracts/ShadowDispatcher.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
// Temporal dispersion — schedules fragment delivery across blocks
contract ShadowDispatcher {
    address public immutable OPERATOR;
    address public immutable ROUTER;
    struct Dispatch{bytes32 routeId;uint256 deliverAt;bool done;}
    mapping(bytes32=>Dispatch) public dispatches;
    bytes32[] public pending;
    uint256 public DISPATCH_INTERVAL = 3;  // every 3 blocks
    event DispatchScheduled(bytes32 routeId,uint256 deliverAt);
    event DispatchExecuted(bytes32 routeId,uint256 block_);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"SD: op");_;}
    constructor(address _op,address _router){OPERATOR=_op;ROUTER=_router;}
    function schedule(bytes32 routeId)external onlyOperator{
        uint256 eta=block.number+DISPATCH_INTERVAL;
        dispatches[routeId]=Dispatch(routeId,eta,false);
        pending.push(routeId);emit DispatchScheduled(routeId,eta);
    }
    function setInterval(uint256 blocks)external onlyOperator{DISPATCH_INTERVAL=blocks;}
    function pendingCount()external view returns(uint256){return pending.length;}
}
