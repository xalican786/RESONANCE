// contracts/ResonanceGovernance.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
contract ResonanceGovernance {
    address public immutable OPERATOR;
    mapping(string=>bytes32) public params;
    struct Change{string param;bytes32 old;bytes32 newVal;uint256 ts;}
    Change[] public changelog;
    uint256 public constant TIMELOCK=24 hours;
    struct TLOp{bytes32 id;uint256 eta;bool done;}
    mapping(bytes32=>TLOp) public timelocks;
    event ParamSet(string param,bytes32 newVal);
    event TimelockQueued(bytes32 id,uint256 eta);
    event TimelockExecuted(bytes32 id);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RGov: op");_;}
    constructor(address _op){
        OPERATOR=_op;
        params["GAS_CAP_GWEI"]=bytes32(uint256(1000));
        params["AMP_OUTPUT_T"]=bytes32(uint256(5000));   // $5T
        params["MAX_CYCLES"]=bytes32(uint256(10_000_000));
        params["RESONANCE_MAX"]=bytes32(uint256(10));
    }
    function setParam(string calldata p,bytes32 v)external onlyOperator{
        bytes32 old=params[p];params[p]=v;
        changelog.push(Change(p,old,v,block.timestamp));
        emit ParamSet(p,v);
    }
    function queueTimelock(bytes32 id,bytes calldata)external onlyOperator{
        timelocks[id]=TLOp(id,block.timestamp+TIMELOCK,false);emit TimelockQueued(id,block.timestamp+TIMELOCK);
    }
    function executeTimelock(bytes32 id)external onlyOperator{
        TLOp storage t=timelocks[id];require(!t.done&&block.timestamp>=t.eta,"RGov: tl");
        t.done=true;emit TimelockExecuted(id);
    }
    function getParam(string calldata p)external view returns(bytes32){return params[p];}
}
