// contracts/ResonanceFee.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
// XCR1-XCR7 fee streams for Resonance
contract ResonanceFee {
    address public immutable OPERATOR;
    address public immutable TREASURY;
    // XCR rates in basis points
    uint256 public XCR1_TRANSFER  = 10;   // 0.1% transfer fee
    uint256 public XCR2_INST      = 25;   // 0.25% institutional
    uint256 public XCR3_XCHAIN    = 15;   // 0.15% cross-chain
    uint256 public XCR4_BRIDGE    = 20;   // 0.2% bridge
    uint256 public XCR5_DORMANCY  = 5;    // 0.05% dormancy yield
    uint256 public XCR6_API       = 50;   // 0.5% API usage
    uint256 public XCR7_PREMIUM   = 100;  // 1.0% premium tier
    uint256 public totalFeeCollected;
    event FeeCollected(string xcr,uint256 amount);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RFee: op");_;}
    constructor(address _op,address _treasury){OPERATOR=_op;TREASURY=_treasury;}
    function calcFee(string calldata xcr,uint256 amount)external view returns(uint256 fee,uint256 net){
        uint256 bps=0;
        if(keccak256(bytes(xcr))==keccak256("XCR1")) bps=XCR1_TRANSFER;
        else if(keccak256(bytes(xcr))==keccak256("XCR2")) bps=XCR2_INST;
        else if(keccak256(bytes(xcr))==keccak256("XCR3")) bps=XCR3_XCHAIN;
        else if(keccak256(bytes(xcr))==keccak256("XCR7")) bps=XCR7_PREMIUM;
        fee=(amount*bps)/10000;net=amount-fee;
    }
    function setRate(string calldata xcr,uint256 bps)external onlyOperator{
        require(bps<=1000,"RFee: max 10%");
        if(keccak256(bytes(xcr))==keccak256("XCR7")) XCR7_PREMIUM=bps;
    }
}
