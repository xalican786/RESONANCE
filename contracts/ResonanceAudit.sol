// contracts/ResonanceAudit.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
contract ResonanceAudit {
    address public immutable OPERATOR;
    struct Entry{string action;address actor;uint256 value;uint256 ts;}
    Entry[] public entries;
    event Logged(string action,address actor,uint256 value);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RAud: op");_;}
    constructor(address _op){OPERATOR=_op;}
    function log(string calldata action,address actor,uint256 value)external onlyOperator{
        entries.push(Entry(action,actor,value,block.timestamp));
        emit Logged(action,actor,value);
    }
    function entryCount()external view returns(uint256){return entries.length;}
    function getEntry(uint256 i)external view returns(Entry memory){return entries[i];}
}
