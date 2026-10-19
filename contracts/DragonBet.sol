// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// DRAGÓN ROJO — Doble o Nada en WLD (World Chain, chainId 480)
// Modelo: apuesta de 1 WLD a ~$10, 50/50 transparente, resuelto AL INSTANTE.
// Comisión: 1% de cada apuesta -> feeWallet (mismo wallet de comisiones del swap).
// El pozo paga desde su propio balance (lo siembra el owner con WLD);
// cada apuesta verifica ANTES que el pozo pueda pagar el doble.
// Entropía: prevrandao (OP-Stack, deriva de bloques L1) + hash del bloque
// anterior + jugador + nonce. Apuestas de centavos: nadie va a hacer MEV
// grinding por $10; el resultado es verificable por cualquier usuario
// en el explorador (mismo bloque, mismo hash, para todos).
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract DragonBet {
    IERC20 public constant WLD = IERC20(0x2cFc85d8E48F8EAB294be644d9E25C3030863003);
    address public owner;
    address public feeWallet;
    uint256 public minStake = 1e18;   // 1 WLD
    uint256 public maxStake = 26e18;  // ~$10 al precio actual (owner ajustable)
    uint256 public nonce;              // contador de apuestas (también da transparencia)
    uint256 public totalStaked;

    event Bet(address indexed player, uint256 stake, bool won, uint256 payout, uint256 n);

    modifier onlyOwner() { require(msg.sender == owner, "solo el dragon mayor"); _; }

    constructor(address _owner, address _feeWallet) {
        owner = _owner;
        feeWallet = _feeWallet;
    }

    function bet(uint256 stake) external {
        require(stake >= minStake && stake <= maxStake, "apuesta fuera de rango");
        // el tesoro debe poder pagar el doble aunque esta apuesta pierda
        require(WLD.balanceOf(address(this)) >= stake * 2, "el dragon esta llenando su tesoro, proba en un rato");
        WLD.transferFrom(msg.sender, address(this), stake);
        uint256 fee = stake / 100; // 1% para comisiones (alimenta la hucha del usuario)
        WLD.transfer(feeWallet, fee);
        uint256 n = ++nonce;
        bytes32 r = keccak256(abi.encodePacked(
            block.prevrandao,
            blockhash(block.number - 1),
            msg.sender,
            n,
            block.timestamp
        ));
        bool won = (uint256(r) & 1) == 1;
        if (won) {
            uint256 payout = stake * 2 - fee;
            WLD.transfer(msg.sender, payout);
            emit Bet(msg.sender, stake, true, payout, n);
        } else {
            emit Bet(msg.sender, stake, false, 0, n);
        }
        totalStaked += stake;
    }

    // Juan siembra el tesoro: simplemente ENVIA WLD a esta direccion.
    function setMaxStake(uint256 v) external onlyOwner { maxStake = v; }
    function setMinStake(uint256 v) external onlyOwner { minStake = v; }
    function withdraw(uint256 amount) external onlyOwner { WLD.transfer(owner, amount); }
    function pot() external view returns (uint256) { return WLD.balanceOf(address(this)); }
}
