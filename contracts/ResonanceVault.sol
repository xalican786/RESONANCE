// contracts/ResonanceVault.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
interface IERC20V{function transfer(address,uint256)external returns(bool);function balanceOf(address)external view returns(uint256);}
contract ResonanceVault {
    address public immutable OPERATOR;
    address public immutable TREASURY;
    struct Asset{address token;string symbol;uint8 decimals;uint256 balancerCap;uint256 aaveCap;bool active;}
    Asset[] public assets;
    mapping(address=>bool) public assetReg;
    uint256 public totalBalancerCap=26_000_000_000;
    uint256 public totalAaveCap=44_000_000_000;
    event AssetAdded(address token,string symbol);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RV: op");_;}
    constructor(address _op,address _treasury){OPERATOR=_op;TREASURY=_treasury;}
    function addAsset(address token,string calldata sym,uint8 dec,uint256 bCap,uint256 aCap)external onlyOperator{
        require(!assetReg[token],"RV: exists");
        assets.push(Asset(token,sym,dec,bCap,aCap,true));assetReg[token]=true;
        emit AssetAdded(token,sym);
    }
    function totalCap()external view returns(uint256){return totalBalancerCap+totalAaveCap;}
    function emergencySweep(address token)external onlyOperator{
        uint256 b=IERC20V(token).balanceOf(address(this));if(b>0)IERC20V(token).transfer(TREASURY,b);
    }
    receive()external payable{}
}
