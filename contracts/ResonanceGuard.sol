// contracts/ResonanceGuard.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
contract ResonanceGuard {
    address public immutable OPERATOR;
    address public immutable RESONANCE;
    mapping(bytes32=>bool) public executed;
    mapping(address=>bool) public blocked;
    uint256 public doubleExecPrevented;
    uint256 public blocked_;
    event GuardBlocked(bytes32 hash, string reason);
    modifier onlyResonance(){require(msg.sender==RESONANCE||msg.sender==OPERATOR,"RG: auth");_;}
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RG: op");_;}
    constructor(address _op,address _res){OPERATOR=_op;RESONANCE=_res;}
    function isSafe(bytes32 hash) external view returns(bool){
        if(executed[hash]){return false;}
        if(blocked[tx.origin]){return false;}
        return true;
    }
    function record(bytes32 hash) external onlyResonance{
        if(executed[hash]){doubleExecPrevented++;emit GuardBlocked(hash,"double");return;}
        executed[hash]=true;
    }
    function blockAddr(address a) external onlyOperator{blocked[a]=true;blocked_++;}
    function unblockAddr(address a) external onlyOperator{blocked[a]=false;}
}
