// contracts/ResonanceExecutor.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
// On-chain execution coordinator — tracks 10M cycles/day
contract ResonanceExecutor {
    address public immutable OPERATOR;
    uint256 public cyclesToday;
    uint256 public cyclesTotal;
    uint256 public maxCyclesPerDay = 10_000_000;
    uint256 public dailyResetAt;
    uint256 public peakCyclesDay;
    uint256 public lastCycleBlock;
    event CycleRecorded(uint256 indexed id,uint256 block_,uint256 resonanceScore);
    event DailyMaxReached(uint256 cycles,uint256 date);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RE: op");_;}
    constructor(address _op){OPERATOR=_op;dailyResetAt=block.timestamp+1 days;}
    function recordCycle(uint256 cycleId,uint8 resonanceScore)external onlyOperator returns(bool canContinue){
        if(block.timestamp>=dailyResetAt){
            if(cyclesToday>peakCyclesDay)peakCyclesDay=cyclesToday;
            cyclesToday=0;dailyResetAt=block.timestamp+1 days;
        }
        if(cyclesToday>=maxCyclesPerDay){emit DailyMaxReached(cyclesToday,block.timestamp);return false;}
        cyclesToday++;cyclesTotal++;lastCycleBlock=block.number;
        emit CycleRecorded(cycleId,block.number,resonanceScore);return true;
    }
    function setMaxCycles(uint256 max)external onlyOperator{maxCyclesPerDay=max;}
    function remaining()external view returns(uint256){return maxCyclesPerDay-cyclesToday;}
}
