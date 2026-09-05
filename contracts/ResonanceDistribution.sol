// contracts/ResonanceDistribution.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
contract ResonanceDistribution {
    address public immutable OPERATOR;
    struct Allocation{address recipient;uint256 bps;string label;bool active;}
    Allocation[] public allocations;
    uint256 public totalBps;
    event AllocationAdded(address recipient,uint256 bps,string label);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RD: op");_;}
    constructor(address _op){OPERATOR=_op;}
    function addAllocation(address r,uint256 bps,string calldata label)external onlyOperator{
        require(totalBps+bps<=10000,"RD: exceeds 100%");
        allocations.push(Allocation(r,bps,label,true));totalBps+=bps;
        emit AllocationAdded(r,bps,label);
    }
    function allocationCount()external view returns(uint256){return allocations.length;}
}
