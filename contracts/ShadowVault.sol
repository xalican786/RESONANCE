// contracts/ShadowVault.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
// Final staging vault — buffer between routing network and treasury
interface IERC20SV{function transfer(address,uint256)external returns(bool);function balanceOf(address)external view returns(uint256);}
contract ShadowVault {
    address public immutable OPERATOR;
    address public immutable TREASURY;
    mapping(address=>uint256) public staged;
    uint256 public totalStaged;
    event Staged(address token,uint256 amount);
    event Released(address token,uint256 amount);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"SV: op");_;}
    constructor(address _op,address _treasury){OPERATOR=_op;TREASURY=_treasury;}
    function stage(address token,uint256 amount)external onlyOperator{
        staged[token]+=amount;totalStaged+=amount;emit Staged(token,amount);
    }
    function release(address token)external onlyOperator{
        uint256 b=IERC20SV(token).balanceOf(address(this));
        if(b>0){IERC20SV(token).transfer(TREASURY,b);staged[token]=0;emit Released(token,b);}
    }
    function emergencySweep(address token)external onlyOperator{
        uint256 b=IERC20SV(token).balanceOf(address(this));
        if(b>0) IERC20SV(token).transfer(TREASURY,b);
    }
    receive()external payable{}
}
