// contracts/ResonanceRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
contract ResonanceRegistry {
    address public immutable OPERATOR;
    struct Chain{uint256 id;string name;bool active;}
    struct Pool{address addr;string protocol;bool active;}
    Chain[] public chains; Pool[] public pools;
    mapping(uint256=>bool) public chainReg;
    mapping(address=>bool) public poolReg;
    event ChainAdded(uint256 id,string name);
    event PoolAdded(address pool,string protocol);
    modifier onlyOperator(){require(msg.sender==OPERATOR,"RReg: op");_;}
    constructor(address _op){
        OPERATOR=_op;
        _add(137,"polygon");_add(42161,"arbitrum");_add(8453,"base");
        _add(10,"optimism");_add(1,"ethereum");_add(56,"bnb");
        _add(43114,"avax");_add(81457,"blast");_add(324,"zksync");
        _add(534352,"scroll");_add(59144,"linea");_add(5000,"mantle");
        _add(100,"gnosis");_add(480,"worldchain");_add(80094,"berachain");
        _add(130,"unichain");_add(1329,"sei");_add(146,"sonic");
        _add(146,"sonic2");_add(137,"polygon2");
    }
    function _add(uint256 id,string memory name)internal{
        chains.push(Chain(id,name,true));chainReg[id]=true;emit ChainAdded(id,name);
    }
    function addChain(uint256 id,string calldata name)external onlyOperator{
        require(!chainReg[id],"RReg: exists");_add(id,name);
    }
    function addPool(address pool,string calldata protocol)external onlyOperator{
        require(!poolReg[pool],"RReg: pool exists");
        pools.push(Pool(pool,protocol,true));poolReg[pool]=true;emit PoolAdded(pool,protocol);
    }
    function chainCount()external view returns(uint256){return chains.length;}
    function poolCount()external view returns(uint256){return pools.length;}
}
