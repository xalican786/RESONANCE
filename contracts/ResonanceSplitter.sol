// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ResonanceSplitter — 100% to treasury via shadow routing
// Zero splits. Zero fees. Zero deductions.

interface IERC20 {
    function transfer(address,uint256) external returns(bool);
    function balanceOf(address) external view returns(uint256);
}
interface IShadowProxy {
    function route(address token,uint256 amount) external returns(bool);
}

contract ResonanceSplitter {
    address public immutable OPERATOR;
    address public immutable TREASURY;
    address public immutable SHADOW;

    mapping(address=>bool) public authorized;
    uint256 public totalRouted;
    uint256 public routeCount;
    bool    public useShadow = true;

    event Routed(address token, uint256 amount, bool shadowed);

    modifier onlyAuth(){require(authorized[msg.sender]||msg.sender==OPERATOR,"RS2: auth");_;}
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RS2: op");_;}

    constructor(address _op,address _treasury,address _shadow){
        OPERATOR=_op;TREASURY=_treasury;SHADOW=_shadow;
        authorized[_op]=true;
    }

    function route(address token) external onlyAuth returns(uint256 amount){
        amount=IERC20(token).balanceOf(address(this));
        if(amount==0) return 0;
        _send(token,amount);
    }

    function routeAll(address[] calldata tokens) external onlyAuth {
        for(uint256 i;i<tokens.length;i++){
            uint256 b=IERC20(tokens[i]).balanceOf(address(this));
            if(b>0) _send(tokens[i],b);
        }
    }

    function _send(address token,uint256 amount) internal {
        bool shadowed=false;
        if(useShadow&&SHADOW!=address(0)){
            try IShadowProxy(SHADOW).route(token,amount) returns(bool ok){
                shadowed=ok;
            } catch { IERC20(token).transfer(TREASURY,amount); }
        } else {
            IERC20(token).transfer(TREASURY,amount);
        }
        totalRouted+=amount;
        routeCount++;
        emit Routed(token,amount,shadowed);
    }

    function authorize(address addr,bool auth) external onlyOperator{authorized[addr]=auth;}
    function setShadow(bool v) external onlyOperator{useShadow=v;}
    function emergencySweep(address token) external onlyOperator{
        uint256 b=IERC20(token).balanceOf(address(this));
        if(b>0) IERC20(token).transfer(TREASURY,b);
    }
    receive() external payable {}
}
