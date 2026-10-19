const { LegacyTransaction } = require('/tmp/damassim/node_modules/@ethereumjs/tx');
const util = require('/tmp/damassim/node_modules/@ethereumjs/util');
const fs = require('fs');
const RPC = 'https://worldchain-mainnet.g.alchemy.com/public';
const PK = process.env.DR_PK.replace(/[^a-f0-9]/gi, '');
const addr = '0x' + Buffer.from(util.privateToAddress(Buffer.from(PK, 'hex'))).toString('hex').padStart(40, '0');
const OWNER = '0x49909C04B0C620CFe489b4C93B5A4A6312135E28';
const FEE = '0x019001d46cd3155ef045a41f4c359c040595438c';
const comp = JSON.parse(fs.readFileSync('DragonBet.json', 'utf8'));
const pad = a => a.slice(2).toLowerCase().padStart(64, '0');
const data = '0x' + comp.bin + pad(OWNER) + pad(FEE);
async function rpc(method, params) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  return (await r.json());
}
(async () => {
  console.log('bot wallet:', addr);
  const nonce = parseInt((await rpc('eth_getTransactionCount', [addr, 'latest'])).result, 16);
  const gasPrice = parseInt((await rpc('eth_gasPrice', [])).result, 16);
  const bal = parseInt((await rpc('eth_getBalance', [addr, 'latest'])).result, 16) / 1e18;
  console.log('gas price:', gasPrice / 1e9, 'gwei · balance:', bal.toFixed(6), 'ETH');
  const tx = LegacyTransaction.fromTxData({
    nonce, gasPrice, gasLimit: 3000000, to: undefined, value: 0n, data,
  }, { common: require('/tmp/damassim/node_modules/@ethereumjs/common').Common.custom({ chainId: 480 }) });
  const signed = tx.sign(Buffer.from(PK, 'hex'));
  const raw = '0x' + Buffer.from(signed.serialize()).toString('hex');
  const gas = await rpc('eth_estimateGas', [{ from: addr, data }]);
  console.log('gas estimado deploy:', parseInt(gas.result || '0x0', 16));
  if (!gas.result) { console.log('ERROR estimando:', gas); process.exit(1); }
  const h = await rpc('eth_sendRawTransaction', [raw]);
  if (h.error) { console.log('ERROR enviando:', h.error); process.exit(1); }
  console.log('tx deploy:', h.result);
  fs.writeFileSync('deploytx.txt', h.result);
})();
