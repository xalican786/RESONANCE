// contracts/ResonanceFieldMap.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
// Persistent field state — all 10 dimension scores across all 20 chains
contract ResonanceFieldMap {
    address public immutable OPERATOR;
    // chainId => dimension => score
    mapping(uint256=>uint8[10]) public chainScores;
    mapping(uint256=>uint256) public chainLastUpdate;
    uint256[] public registeredChains;
    uint256 public globalAlignmentScore;
    event MapUpdated(uint256 chainId,uint8[10] scores,uint256 ts);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RFM: op");_;}
    constructor(address _op){
        OPERATOR=_op;
        uint256[20] memory ids=[uint256(137),42161,8453,10,1,56,43114,81457,324,534352,
                                 59144,5000,100,480,80094,130,1329,146,146,137];
        for(uint256 i;i<20;i++){registeredChains.push(ids[i]);}
    }
    function updateChain(uint256 chainId,uint8[10] calldata scores)external onlyOperator{
        chainScores[chainId]=scores;chainLastUpdate[chainId]=block.timestamp;
        uint8 total=0;for(uint256 i;i<10;i++)total+=scores[i];
        globalAlignmentScore=(globalAlignmentScore*99+(total*100/10))/100;
        emit MapUpdated(chainId,scores,block.timestamp);
    }
    function getChainScores(uint256 chainId)external view returns(uint8[10] memory){return chainScores[chainId];}
    function getGlobalScore()external view returns(uint256){return globalAlignmentScore;}
}
