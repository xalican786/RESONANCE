// contracts/ResonanceToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
contract ResonanceToken {
    string  public name="Resonance Token";
    string  public symbol="RSN";
    uint8   public decimals=18;
    uint256 public totalSupply;
    address public immutable OPERATOR;
    mapping(address=>uint256) public balanceOf;
    mapping(address=>mapping(address=>uint256)) public allowance;
    event Transfer(address indexed from,address indexed to,uint256 value);
    event Approval(address indexed owner,address indexed spender,uint256 value);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RSN: op");_;}
    constructor(address _op){OPERATOR=_op;}
    function mint(address to,uint256 amt)external onlyOperator{totalSupply+=amt;balanceOf[to]+=amt;emit Transfer(address(0),to,amt);}
    function burn(address from,uint256 amt)external onlyOperator{balanceOf[from]-=amt;totalSupply-=amt;emit Transfer(from,address(0),amt);}
    function transfer(address to,uint256 amt)external returns(bool){balanceOf[msg.sender]-=amt;balanceOf[to]+=amt;emit Transfer(msg.sender,to,amt);return true;}
    function approve(address sp,uint256 amt)external returns(bool){allowance[msg.sender][sp]=amt;emit Approval(msg.sender,sp,amt);return true;}
    function transferFrom(address from,address to,uint256 amt)external returns(bool){
        allowance[from][msg.sender]-=amt;balanceOf[from]-=amt;balanceOf[to]+=amt;emit Transfer(from,to,amt);return true;
    }
}
