// contracts/ResonanceTreasury.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
contract ResonanceTreasury {
    address public immutable OPERATOR;
    struct Record{uint256 cycleId;uint256 output;uint8 resonanceScore;uint8 resonanceMult;uint256 ts;}
    Record[] public records;
    uint256 public totalOutputAccum;
    event CycleRecorded(uint256 cycleId,uint256 output,uint8 resonance);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RT: op");_;}
    constructor(address _op){OPERATOR=_op;}
    function record(uint256 cycleId,uint256 output,uint8 score,uint8 mult)external onlyOperator{
        records.push(Record(cycleId,output,score,mult,block.timestamp));
        if(totalOutputAccum<type(uint128).max) totalOutputAccum+=output>type(uint128).max?type(uint128).max:output;
        emit CycleRecorded(cycleId,output,score);
    }
    function recordCount()external view returns(uint256){return records.length;}
    function getRecord(uint256 i)external view returns(Record memory){return records[i];}
}
