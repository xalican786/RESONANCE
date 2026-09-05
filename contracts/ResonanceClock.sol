// contracts/ResonanceClock.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
// Block timing oracle — identifies optimal extraction windows
contract ResonanceClock {
    address public immutable OPERATOR;
    uint256 public lastBlockTime;
    uint256 public avgBlockInterval;
    uint256 public blockCount;
    uint256 public optimalWindowScore;  // 0-100 — how good current block is
    event ClockTick(uint256 block_,uint256 interval,uint256 score);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RC: op");_;}
    constructor(address _op){OPERATOR=_op;lastBlockTime=block.timestamp;}
    function tick()external{
        uint256 interval=block.timestamp-lastBlockTime;
        lastBlockTime=block.timestamp;blockCount++;
        avgBlockInterval=(avgBlockInterval*99+interval*100)/100;// EMA
        // Score: faster blocks = more MEV opportunity density
        optimalWindowScore=interval<3?90:interval<5?80:70;
        emit ClockTick(block.number,interval,optimalWindowScore);
    }
    function getScore()external view returns(uint256){return optimalWindowScore;}
}
