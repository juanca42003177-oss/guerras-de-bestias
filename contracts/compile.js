const solc=require('/tmp/damassim/node_modules/solc'),fs=require('fs');
const input={language:'Solidity',sources:{'DragonBet.sol':{content:fs.readFileSync('DragonBet.sol','utf8')}},settings:{outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}},optimizer:{enabled:true,runs:200}}};
const out=JSON.parse(solc.compile(JSON.stringify(input)));
if(out.errors) out.errors.forEach(e=>console.log(e.severity.toUpperCase(), e.formattedMessage));
const c=out.contracts['DragonBet.sol'].DragonBet;
fs.writeFileSync('DragonBet.json',JSON.stringify({abi:c.abi,bin:c.evm.bytecode.object,deployed:c.evm.deployedBytecode.object},null,1));
console.log('COMPILADO OK — bytecode:',c.evm.bytecode.object.length,'chars');
