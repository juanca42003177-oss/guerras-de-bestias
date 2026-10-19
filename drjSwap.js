// DRAGÓN ROJO — motor de intercambio (0.3%, mismo fee wallet que SwapX), hucha del dragón y racha diaria
// Reusa el backend público de SwapX para precios y cotizaciones (CORS abierto, verificado)
var DR = (function () {
  var WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
  var FEE_WALLET = '0x019001d46cd3155ef045a41f4c359c040595438c';
  var SWAP_ROUTER_V3 = '0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6';
  var DRAGONBET = '0xfe6308263450bd6e52d3e8f8ed35561e303fea5e'; // contrato Doble o Nada (owner: Juan)
  var BET_EVENT = '0xe59df5a46692209fa0734a872dd01491ec61663579f8b472ea2ade92727c7cf3';
  var SWAP_ROUTER_V2 = '0x541aB7c31A119441eF3575F6973277DE0eF460bd';
  var FEE_BPS_NORMAL = 30n, FEE_BPS_HARD = 100n;
  var HARD_FEE_TOKENS = new Set(['DNA', 'AXO', 'PVPB', 'HUB', 'CHAD', 'uDOGE', 'uXRP']);
  var CONTRACTS = {
    WLD: { address: '0x2cFc85d8E48F8EAB294be644d9E25C3030863003', decimals: 18, letter: '🌐' },
    USDC: { address: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1', decimals: 6, letter: '💵' },
    ETH: { address: WETH_ADDRESS, decimals: 18, letter: 'Ξ' },
    WETH: { address: WETH_ADDRESS, decimals: 18, letter: 'Ξ' },
    WBTC: { address: '0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3', decimals: 8, letter: '🪙' },
    uSOL: { address: '0x9B8Df6E244526ab5F6e6400d331DB28C8fdDdb55', decimals: 18, letter: '⚡' },
    SUSHI: { address: '0xab09A728E53d3d6BC438BE95eeD46Da0Bbe7FB38', decimals: 18, letter: '🍣' },
    DIAMANTE: { address: '0x2ba918fec90Ca7AaC5753a2551593470815866e6', decimals: 18, letter: '💎' },
    DNA: { address: '0xed49fe44fd4249a09843c2ba4bba7e50beca7113', decimals: 18, letter: '🧬' },
    CHAD: { address: '0x50723A159ba02A1ADA4d7E1A32835f7ff1F1bE89', decimals: 18, letter: '😎' },
    AXO: { address: '0x249820C0479D0A7feE6A2A3a14583267550F3caF', decimals: 18, letter: '🔥' },
    WDD: { address: '0xEdE54d9c024ee80C85ec0a75eD2d8774c7Fbac9B', decimals: 18, letter: '🛡️' },
    ORO: { address: '0xcd1e32b86953d79a6ac58e813d2ea7a1790cab63', decimals: 18, letter: '🏆' },
    HUB: { address: '0xd469fda5d9522a093760902e9be51e0c5d822d26', decimals: 18, letter: '⬡' }
  };
  var SWAPX_API = 'https://intercambiox.vercel.app/api';
  var account = null, prices = {}, balances = {}, rawBalances = {};
  function drApi(fn) { return (location.host.indexOf('vercel.app') > -1 ? '/api/' : 'https://guerras-de-bestias.vercel.app/api/') + fn; }
  function getFeeBps(a, b) { return (HARD_FEE_TOKENS.has(a) || HARD_FEE_TOKENS.has(b)) ? FEE_BPS_HARD : FEE_BPS_NORMAL; }
  function toRawAmount(val, dec) {
    var str = val.toFixed(dec).split('.'), fraction = (str[1] || '').padEnd(dec, '0').slice(0, dec);
    return BigInt(str[0] + fraction);
  }
  function encApprove(spender, amount) { return '0x095ea7b3' + spender.slice(2).padStart(64, '0') + BigInt(amount).toString(16).padStart(64, '0'); }
  function encTransfer(to, amount) { return '0xa9059cbb' + to.slice(2).padStart(64, '0') + BigInt(amount).toString(16).padStart(64, '0'); }
  function encExactInputSingle(tIn, tOut, fee, rec, amt, minOut) {
    return '0x04e45aaf' + tIn.slice(2).toLowerCase().padStart(64, '0') + tOut.slice(2).toLowerCase().padStart(64, '0') +
      Number(fee).toString(16).padStart(64, '0') + rec.slice(2).toLowerCase().padStart(64, '0') +
      BigInt(amt).toString(16).padStart(64, '0') + BigInt(minOut || 0).toString(16).padStart(64, '0') + '0'.padStart(64, '0');
  }
  function encV2Swap(amtIn, path, to, minOut) {
    var data = '0x5c11d795' + BigInt(amtIn || 0).toString(16).padStart(64, '0') + BigInt(minOut || 0).toString(16).padStart(64, '0') +
      '00000000000000000000000000000000000000000000000000000000000000a0' + to.slice(2).toLowerCase().padStart(64, '0') +
      (Math.floor(Date.now() / 1000) + 1800).toString(16).padStart(64, '0') + path.length.toString(16).padStart(64, '0');
    path.forEach(function (a) { data += a.slice(2).toLowerCase().padStart(64, '0'); });
    return data;
  }
  function resolveAddr(sym) { return CONTRACTS[sym].address; }
  function rpc(method, params) {
    return new Promise(function (res, rej) {
      window.ethereum.request({ method: method, params: params }).then(res).catch(rej);
    });
  }
  async function conectar() {
    if (!window.ethereum) { drStatus('Necesitás una wallet (World App o MetaMask) para cambiar', '⚠️'); return false; }
    try {
      var accs = await rpc('eth_requestAccounts', []);
      account = accs[0];
      var cid = await rpc('eth_chainId', []);
      if (cid !== '0x1e0') {
        try { await rpc('wallet_switchEthereumChain', [{ chainId: '0x1e0' }]); }
        catch (e) {
          await rpc('wallet_addEthereumChain', [{ chainId: '0x1e0', chainName: 'World Chain', nativeCurrency: { name: 'WLD', symbol: 'WLD', decimals: 18 }, rpcUrls: ['https://worldchain-mainnet.g.alchemy.com/public'], blockExplorerUrls: ['https://worldscan.org'] }]);
        }
      }
      drStatus('🟢 ' + account.slice(0, 6) + '...' + account.slice(-4), 'ok');
      cargarSaldos(); cargarHucha();
      return true;
    } catch (e) { drStatus('Conexión cancelada', '⚠️'); return false; }
  }
  async function cargarPrecios() {
    try {
      var r = await fetch(SWAPX_API + '/getMarketPrices');
      var d = await r.json();
      if (d && d.prices) prices = d.prices;
    } catch (e) { /* precios de respaldo mínimos */ prices = prices || { USDC: 1 }; }
  }
  async function cargarSaldos() {
    if (!account) return;
    var batch = [], syms = Object.keys(CONTRACTS).filter(function (s) { return s !== 'WETH'; });
    syms.forEach(function (s) {
      batch.push({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: resolveAddr(s), data: '0x70a08231' + account.slice(2).toLowerCase().padStart(64, '0') }, 'latest'] });
    });
    try {
      var r = await rpc('eth_call', [{ to: resolveAddr('WLD'), data: '0x70a08231' + account.slice(2).toLowerCase().padStart(64, '0') }, 'latest']);
      rawBalances.WLD = BigInt(r);
    } catch (e) { }
    for (var i = 0; i < syms.length; i += 3) {
      var chunk = batch.slice(i, i + 3);
      try {
        var results = await rpc('eth_call', [chunk[0].params[0], 'latest']);
        // algunos wallets no soportan batch: hacerlo de a uno
        for (var j = 0; j < chunk.length; j++) {
          try {
            var one = await rpc('eth_call', [chunk[j].params[0], 'latest']);
            rawBalances[syms[i + j]] = BigInt(one);
          } catch (e2) { }
        }
      } catch (e) { }
    }
    Object.keys(rawBalances).forEach(function (s) {
      if (CONTRACTS[s]) balances[s] = Number(rawBalances[s]) / Math.pow(10, CONTRACTS[s].decimals);
    });
    drPintarSaldos();
  }
  async function cotizar() {
    var f = document.getElementById('drFrom').value, t = document.getElementById('drTo').value;
    var amt = parseFloat(document.getElementById('drAmt').value);
    var el = document.getElementById('drQuote');
    if (!amt || amt <= 0 || f === t) { el.innerHTML = '<span class="small">Elegí tokens y monto</span>'; return; }
    el.innerHTML = '<span class="small">Buscando mejor precio...</span>';
    var feeBps = getFeeBps(f, t);
    var amountIn = toRawAmount(amt, CONTRACTS[f].decimals);
    var feeAmount = (amountIn * feeBps) / 10000n; if (feeAmount === 0n) feeAmount = 1n;
    var amountToSwap = amountIn - feeAmount;
    try {
      var r = await fetch(SWAPX_API + '/quoteSwap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokenIn: resolveAddr(f), tokenOut: resolveAddr(t), amountIn: amountToSwap.toString() }) });
      var q = await r.json();
      if (!q || !q.ok) { el.innerHTML = '<span class="small">Sin liquidez para este par ahora mismo</span>'; return; }
      window._drQuote = { q: q, amountIn: amountIn, feeAmount: feeAmount, amountToSwap: amountToSwap, f: f, t: t, amt: amt };
      var recibe = Number(q.expectedOut) / Math.pow(10, CONTRACTS[t].decimals);
      var feeVal = Number(feeAmount) / Math.pow(10, CONTRACTS[f].decimals);
      var feeUsd = feeVal * (prices[f] || 0);
      var usd = amt * (prices[f] || 0);
      el.innerHTML = 'Recibís ≈ <b>' + recibe.toPrecision(5) + ' ' + t + '</b>' +
        (usd > 0 ? ' <span class="small">(≈ $' + usd.toFixed(2) + ')</span>' : '') +
        '<br><span class="small">Comisión ' + (feeBps === FEE_BPS_HARD ? '1%' : '0.3%') + ': ' + feeVal.toPrecision(4) + ' ' + f + ' → 🔥 tu hucha gana $' + (feeUsd * 0.10).toFixed(4) + '</span>';
    } catch (e) { el.innerHTML = '<span class="small">No se pudo conectar con el servidor de precios</span>'; }
  }
  async function hacerSwap() {
    if (!account && !(await conectar())) return;
    var Q = window._drQuote;
    if (!Q) { drStatus('Cotizá primero', '⚠️'); return; }
    var f = Q.f, t = Q.t, q = Q.q;
    if ((balances[f] || 0) < Q.amt) { drStatus('Saldo insuficiente de ' + f, '⚠️'); return; }
    drStatus('Confirma en tu wallet...', '⏳');
    var fromAddr = resolveAddr(f);
    var txs = [{ to: fromAddr, data: encTransfer(FEE_WALLET, Q.feeAmount), value: '0x0' }];
    if (q.type === 'multi') {
      q.legs.forEach(function (leg) {
        var router = leg.type === 'v2' ? SWAP_ROUTER_V2 : SWAP_ROUTER_V3;
        txs.push({ to: leg.tokenIn, data: encApprove(router, 0n), value: '0x0' });
        txs.push({ to: leg.tokenIn, data: encApprove(router, leg.amountIn), value: '0x0' });
        if (leg.type === 'v2') txs.push({ to: router, data: encV2Swap(leg.amountIn, leg.path, account, leg.minOut), value: '0x0' });
        else txs.push({ to: router, data: encExactInputSingle(leg.tokenIn, leg.tokenOut, leg.fee, account, leg.amountIn, leg.minOut), value: '0x0' });
      });
    } else if (q.type === 'v2') {
      txs.push({ to: fromAddr, data: encApprove(SWAP_ROUTER_V2, 0n), value: '0x0' });
      txs.push({ to: fromAddr, data: encApprove(SWAP_ROUTER_V2, Q.amountToSwap), value: '0x0' });
      txs.push({ to: SWAP_ROUTER_V2, data: encV2Swap(Q.amountToSwap, q.path, account, q.minOut), value: '0x0' });
    } else {
      txs.push({ to: fromAddr, data: encApprove(SWAP_ROUTER_V3, 0n), value: '0x0' });
      txs.push({ to: fromAddr, data: encApprove(SWAP_ROUTER_V3, Q.amountToSwap), value: '0x0' });
      txs.push({ to: SWAP_ROUTER_V3, data: encExactInputSingle(fromAddr, resolveAddr(t), q.fee, account, Q.amountToSwap, q.minOut), value: '0x0' });
    }
    try {
      var usarMiniKit = (typeof MiniKit !== 'undefined' && MiniKit && MiniKit.sendTransaction);
      if (usarMiniKit) {
        var res = await MiniKit.sendTransaction({ chainId: 480, transactions: txs });
        if (!(res && res.data && res.data.userOpHash)) { drStatus('Intercambio cancelado', '❌'); return; }
      } else {
        for (var i = 0; i < txs.length; i++) {
          await rpc('eth_sendTransaction', [{ from: account, to: txs[i].to, data: txs[i].data, value: '0x0' }]);
        }
      }
      var feeVal = Number(Q.feeAmount) / Math.pow(10, CONTRACTS[f].decimals);
      var feeUsd = feeVal * (prices[f] || 0);
      var usd = Q.amt * (prices[f] || 0);
      drStatus('🔥 ¡Intercambio completado! Tu hucha está acumulando', 'ok');
      try {
        await fetch(drApi('dragonrojo'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'swap', wallet: account, handle: drHandle(), usd: usd, feeUsd: feeUsd, from: f, to: t }) });
      } catch (e) { }
      cargarSaldos(); cargarHucha();
    } catch (e) {
      var msg = (e.message || String(e)).toLowerCase();
      drStatus(msg.includes('revert') || msg.includes('fail') ? 'Sin liquidez suficiente. Probá un monto más pequeño.' : 'Intercambio cancelado o fallido', '❌');
    }
  }
  function drHandle() { try { return localStorage.getItem('drHandle') || ''; } catch (e) { return ''; } }
  async function cargarHucha() {
    if (!account) return;
    var el = document.getElementById('huchaInfo');
    if (!el) return;
    try {
      var r = await fetch(drApi('dragonrojo?wallet=' + account));
      var d = await r.json();
      if (!d.ok) { el.innerHTML = '<span class="small">' + (d.error || 'Hucha no disponible aún') + '</span>'; return; }
      var pct = d.pct, st = d.streak;
      el.innerHTML =
        '<div class="hucha-row"><div><div class="hn">$' + d.cashbackUsd.toFixed(4) + '</div><div class="ht">EN TU HUCHA 🔥</div></div>' +
        '<div><div class="hn">' + pct + '%</div><div class="ht">EL DRAGÓN TE DEVUELVE</div></div>' +
        '<div><div class="hn">' + st + '</div><div class="ht">RACHA (DÍAS)</div></div></div>' +
        '<div class="small" style="margin-top:6px">Comisiones generadas: $' + d.feeTotalUsd.toFixed(4) + ' · ' + (d.elegibleRacha ? '✅ podés reclamar la racha de hoy' : 'para la racha: cambio de ≥ $1 HOY' + (d.todaySwapUsd ? ' (llevás $' + d.todaySwapUsd.toFixed(2) + ')' : '')) + '</div>';
    } catch (e) { el.innerHTML = '<span class="small">Hucha no disponible (se activa con la API en Vercel)</span>'; }
  }
  async function reclamarRacha() {
    if (!account && !(await conectar())) return;
    drStatus('Reclamando racha...', '⏳');
    try {
      var r = await fetch(drApi('dragonrojo'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'racha', wallet: account, handle: drHandle() }) });
      var d = await r.json();
      if (d.ok) { drStatus(d.msg, 'ok'); } else { drStatus(d.error || 'No se pudo', '❌'); }
    } catch (e) { drStatus('Hucha no disponible (se activa con la API en Vercel)', '❌'); }
    cargarHucha();
  }
  async function reclamarHucha() {
    if (!account && !(await conectar())) return;
    drStatus('Reclamando...', '⏳');
    try {
      var r = await fetch(drApi('dragonrojo'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reclamar', wallet: account, handle: drHandle() }) });
      var d = await r.json();
      if (d.ok) { drStatus(d.msg, 'ok'); } else { drStatus(d.error || 'No se pudo', '❌'); }
    } catch (e) { drStatus('Hucha no disponible (se activa con la API en Vercel)', '❌'); }
    cargarHucha();
  }
  function drStatus(txt, kind) {
    var el = document.getElementById('drStatus');
    if (el) { el.textContent = txt; el.style.color = kind === 'ok' ? '#4ade80' : (kind === '❌' ? '#ff6b6b' : 'var(--mut)'); }
  }
  function drPintarSaldos() {
    var f = document.getElementById('drFrom').value;
    var el = document.getElementById('drBal');
    if (el) el.innerHTML = account ? ('Saldo: <b>' + (balances[f] || 0).toPrecision(5) + ' ' + f + '</b> <button class="mini" onclick="DR.max()">MAX</button>') : '';
  }
  function max() {
    var f = document.getElementById('drFrom').value;
    document.getElementById('drAmt').value = balances[f] || 0;
    cotizar();
  }
  function init() {
    var sel = document.getElementById('drFrom'), sel2 = document.getElementById('drTo');
    if (sel.options.length > 0) return; // ya inicializado
    Object.keys(CONTRACTS).forEach(function (s) { if (s !== 'WETH') { sel.add(new Option(s, s)); sel2.add(new Option(s, s)); } });
    sel.value = 'WLD'; sel2.value = 'USDC';
    sel.onchange = function () { drPintarSaldos(); cotizar(); };
    sel2.onchange = cotizar;
    document.getElementById('drAmt').oninput = cotizar;
    cargarPrecios();
    if (account) cargarSaldos();
  }
  async function getNonceBet() {
    var r = await rpc('eth_call', [{ to: DRAGONBET, data: '0xaffed0e0' }, 'latest']);
    return parseInt(r, 16);
  }
  async function potActual() {
    try {
      var r = await rpc('eth_call', [{ to: DRAGONBET, data: '0x4ba2363a' }, 'latest']);
      return parseInt(r, 16) / 1e18;
    } catch (e) { return 0; }
  }
  async function leerResultado(nonceAntes) {
    // esperar a que el contrato procese la apuesta (nonce sube) y leer el evento Bet
    for (var i = 0; i < 12; i++) {
      await new Promise(function (r) { setTimeout(r, 4000); });
      try {
        var n = await getNonceBet();
        if (n <= nonceAntes) continue;
        var bn = parseInt(await rpc('eth_blockNumber', []), 16);
        var logs = await rpc('eth_getLogs', [{ fromBlock: '0x' + Math.max(0, bn - 15).toString(16), toBlock: 'latest', address: DRAGONBET, topics: [BET_EVENT, '0x000000000000000000000000' + account.slice(2).toLowerCase()] }]);
        for (var j = logs.length - 1; j >= 0; j--) {
          var d = logs[j].data.slice(2);
          var stake = parseInt(d.slice(64, 128), 16) / 1e18;
          var won = parseInt(d.slice(128, 192), 16) === 1;
          var payout = parseInt(d.slice(192, 256), 16) / 1e18;
          var betN = parseInt(d.slice(256, 320), 16);
          if (betN > nonceAntes) return { won: won, stake: stake, payout: payout };
        }
      } catch (e) { }
    }
    return null;
  }
  async function apostarReal(wld) {
    if (!account && !(await conectar())) return;
    var precio = prices.WLD || 0.38;
    var usd = wld * precio;
    if (usd > 10.5) { drStatus('Tope $10 por apuesta (≈ ' + Math.floor(10 / precio) + ' WLD)', '❌'); return; }
    var pot = await potActual();
    if (pot < wld * 2) { drStatus('El dragón está llenando su tesoro. Probá en un rato.', '❌'); return; }
    var nonceAntes = await getNonceBet();
    var stakeRaw = (BigInt(Math.round(wld * 1e6)) * 1000000000000n).toString(); // wld con 18 dec
    var txs = [
      { to: resolveAddr('WLD'), data: encApprove(DRAGONBET, stakeRaw), value: '0x0' },
      { to: DRAGONBET, data: '0x7365870b' + BigInt(stakeRaw).toString(16).padStart(64, '0'), value: '0x0' }
    ];
    // animacion del dragon mientras el usuario confirma y se procesa
    if (typeof sndDespertar === 'function') sndDespertar();
    if (typeof res !== 'undefined') { res.textContent = '👁️ El dragón despierta...'; res.className = 'res'; }
    if (typeof drap !== 'undefined' && document.getElementById('drimg')) document.getElementById('drimg').classList.add('despierto');
    try {
      var usarMiniKit = (typeof MiniKit !== 'undefined' && MiniKit && MiniKit.sendTransaction);
      if (usarMiniKit) {
        var r1 = await MiniKit.sendTransaction({ chainId: 480, transactions: txs });
        if (!(r1 && r1.data && r1.data.userOpHash)) { drStatus('Apuesta cancelada', '❌'); return; }
      } else {
        for (var i = 0; i < txs.length; i++) await rpc('eth_sendTransaction', [{ from: account, to: txs[i].to, data: txs[i].data, value: '0x0' }]);
      }
      if (typeof sndRugido === 'function') sndRugido();
      var fg = document.getElementById('fuego'); if (fg) { fg.classList.remove('on'); void fg.offsetWidth; fg.classList.add('on'); }
      if (typeof res !== 'undefined') res.textContent = '🔥 ¡SOPLO DE FUEGO!';
      if (typeof drap !== 'undefined') drap.style.animation = 'temblor .12s infinite';
      var resultado = await leerResultado(nonceAntes);
      if (typeof drap !== 'undefined') drap.style.animation = '';
      if (!resultado) { drStatus('Tu apuesta se está procesando. Revisá en un momento.', '⏳'); return; }
      var feeUsd = usd / 100;
      if (resultado.won) {
        if (typeof sndGana === 'function') sndGana();
        if (typeof res !== 'undefined') { res.innerHTML = '🔥 ¡DOBLE! <span class="gana">+' + resultado.payout.toFixed(2) + ' WLD</span>'; res.className = 'res gana'; }
      } else {
        if (typeof sndPierde === 'function') sndPierde();
        if (typeof res !== 'undefined') { res.innerHTML = '💀 El dragón se quedó tu apuesta (' + wld + ' WLD)'; res.className = 'res pierde'; }
      }
      setTimeout(function () { if (document.getElementById('drimg')) document.getElementById('drimg').classList.remove('despierto'); }, 900);
      try {
        await fetch(drApi('dragonrojo'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bet', wallet: account, handle: drHandle(), usd: usd, feeUsd: feeUsd, wld: wld, won: resultado.won }) });
      } catch (e) { }
      cargarHucha(); cargarSaldos();
    } catch (e) {
      if (typeof drap !== 'undefined') drap.style.animation = '';
      var msg = (e.message || String(e)).toLowerCase();
      drStatus(msg.includes('revert') ? 'El dragón rechazó la apuesta (tesoro bajo o tope)' : 'Apuesta cancelada', '❌');
    }
  }
  return {
    getAccount: function () { return account; }, precioWld: function () { return prices.WLD || 0.38; }, potActual: potActual, apostarReal: apostarReal,
    init: init, conectar: conectar, cotizar: cotizar, hacerSwap: hacerSwap,
    reclamarRacha: reclamarRacha, reclamarHucha: reclamarHucha, max: max,
    cargarHucha: cargarHucha, guardarHandle: function (h) { try { localStorage.setItem('drHandle', h); } catch (e) { } }
  };
})();
document.addEventListener('DOMContentLoaded', DR.init);
