// contracts/ResonanceBundle.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
contract ResonanceBundle {
    address public immutable OPERATOR;
    struct Bundle{bytes32 hash;uint256 block_;uint256 output;bool landed;uint256 profit;}
    Bundle[] public bundles;
    mapping(bytes32=>uint256) public idx;
    mapping(bytes32=>bool) public submitted;
    uint256 public totalLanded;uint256 public totalSubmitted;
    event BundleSubmitted(bytes32 hash,uint256 block_,uint256 output);
    event BundleLanded(bytes32 hash,uint256 profit);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RB2: op");_;}
    constructor(address _op){OPERATOR=_op;}
    function recordSubmission(bytes32 hash,uint256 block_,uint256 output)external onlyOperator{
        require(!submitted[hash],"RB2: exists");submitted[hash]=true;
        idx[hash]=bundles.length;bundles.push(Bundle(hash,block_,output,false,0));totalSubmitted++;
        emit BundleSubmitted(hash,block_,output);
    }
    function recordLanding(bytes32 hash,uint256 profit)external onlyOperator{
        Bundle storage b=bundles[idx[hash]];require(!b.landed,"RB2: landed");
        b.landed=true;b.profit=profit;totalLanded++;emit BundleLanded(hash,profit);
    }
    function landingRate()external view returns(uint256){
        return totalSubmitted>0?(totalLanded*10000)/totalSubmitted:0;
    }
}
