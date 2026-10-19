// DRAGÓN ROJO — motor de comisiones, hucha del dragón y racha diaria
// Data: GitHub dragon-labs-data (repo privado), rama dragonrojo-data, archivo huchas.json
// Avisos: Telegram a Juan (pagos manuales, igual que premios de volumen)
const REPO = process.env.GITHUB_DATA_REPO || 'juanca42003177-oss/dragon-labs-data';
const BRANCH = 'dragonrojo-data';
const FILE = 'huchas.json';
const TOK = process.env.GITHUB_TOKEN;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '8022768138';
const H = () => ({ Authorization: 'token ' + TOK, Accept: 'application/vnd.github+json', 'User-Agent': 'dragon-rojo' });

function cors(res, code, obj) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  return res.status(code).json(obj);
}
function fechaGT() { return new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10); } // GT = UTC-6 siempre
function ayerGT() { return new Date(Date.now() - 30 * 3600 * 1000).toISOString().slice(0, 10); }
function pctDe(streak) { return 10 + Math.min(5, streak * 0.5); } // 10% base + 0.5% por día, tope 15%

let branchReady = false;
async function ensureBranch() {
  if (branchReady) return;
  const chkMe = await fetch('https://api.github.com/user', { headers: H() });
  if (!chkMe.ok) throw new Error('GITHUB_TOKEN invalido o ausente (HTTP ' + chkMe.status + ')');
  const chk = await fetch(`https://api.github.com/repos/${REPO}/git/ref/heads/${BRANCH}`, { headers: H() });
  if (chk.ok) { branchReady = true; return; }
  const rb = await fetch(`https://api.github.com/repos/${REPO}`, { headers: H() });
  if (!rb.ok) throw new Error('repo de datos no accesible (HTTP ' + rb.status + ', usando: ' + REPO + ')');
  const base = (await rb.json()).default_branch || 'main';
  const mb = await fetch(`https://api.github.com/repos/${REPO}/git/ref/heads/${base}`, { headers: H() });
  if (!mb.ok) throw new Error('rama base ' + base + ' no encontrada (HTTP ' + mb.status + ')');
  const sha = (await mb.json()).object.sha;
  const cr = await fetch(`https://api.github.com/repos/${REPO}/git/refs`, {
    method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'refs/heads/' + BRANCH, sha })
  });
  if (!cr.ok && cr.status !== 422) throw new Error('no se pudo crear rama (HTTP ' + cr.status + ')');
  branchReady = true;
}
async function leer() {
  await ensureBranch();
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}?ref=${BRANCH}`, { headers: H() });
  if (r.status === 404) return { data: {}, sha: null };
  if (!r.ok) throw new Error('no se pudo leer ' + FILE + ' (HTTP ' + r.status + ')');
  const j = await r.json();
  return { data: JSON.parse(Buffer.from(j.content, 'base64').toString()), sha: j.sha };
}
async function guardar(data, sha, msg) {
  const body = JSON.stringify({ message: msg, branch: BRANCH, content: Buffer.from(JSON.stringify(data)).toString('base64'), ...(sha ? { sha } : {}) });
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
    method: 'PUT', headers: { ...H(), 'Content-Type': 'application/json' }, body
  });
  if (!r.ok) throw new Error('no se pudo guardar (HTTP ' + r.status + ')');
  return (await r.json()).content.sha;
}
async function aviso(texto) {
  if (!TG_TOKEN) return;
  try { await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text: texto })
  }); } catch (e) { /* nunca romper el flujo por el aviso */ }
}
function limpio(w) { return String(w || '').toLowerCase().slice(0, 42); }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return cors(res, 200, { ok: true });
  if (req.method === 'GET') {
    const w = limpio(req.query.wallet);
    if (!w) return cors(res, 200, { ok: true, health: 'vivo' });
    try {
      const { data } = await leer();
      const u = data[w] || { feeTotalUsd: 0, cashbackUsd: 0, streak: 0, todaySwapUsd: 0, lastSwapDay: '', handle: '' };
      return cors(res, 200, { ok: true, wallet: w, handle: u.handle || '', feeTotalUsd: +u.feeTotalUsd.toFixed(4), cashbackUsd: +u.cashbackUsd.toFixed(4), pendingUsd: +(u.pendingUsd || 0).toFixed(4), pct: pctDe(u.streak || 0), streak: u.streak || 0, todaySwapUsd: +(u.todaySwapUsd || 0), elegibleRacha: u.todaySwapUsd >= 1 && u.lastSwapDay === fechaGT() });
    } catch (e) { return cors(res, 500, { ok: false, error: e.message }); }
  }
  if (req.method !== 'POST') return cors(res, 405, { ok: false, error: 'metodo no permitido' });
  const b = req.body || {};
  try {
    const { data, sha } = await leer();
    const w = limpio(b.wallet);
    if (!w) return cors(res, 400, { ok: false, error: 'wallet requerida' });
    const hoy = fechaGT();
    let u = data[w] || { feeTotalUsd: 0, cashbackUsd: 0, pendingUsd: 0, streak: 0, lastClaimDay: '', todaySwapUsd: 0, lastSwapDay: '', handle: '' };
    u.handle = b.handle || u.handle || '';

    if (b.action === 'swap') {
      const usd = Math.max(0, +b.usd || 0);
      const feeUsd = Math.max(0, +b.feeUsd || 0);
      if (usd < 1) return cors(res, 400, { ok: false, error: 'monto invalido' });
      const pct = pctDe(u.streak || 0);
      u.feeTotalUsd += feeUsd;
      u.cashbackUsd += feeUsd * pct / 100;
      if (u.lastSwapDay === hoy) u.todaySwapUsd += usd; else { u.todaySwapUsd = usd; u.lastSwapDay = hoy; }
      data[w] = u;
      await guardar(data, sha, 'dragonrojo swap ' + w.slice(0, 8));
      await aviso(`🔥 DRAGÓN ROJO — Intercambio\n@${u.handle || 'usuario'} cambió $${usd.toFixed(2)} ${b.from || '?'}→${b.to || '?'}\nComisión: $${feeUsd.toFixed(4)} · vuelve a la hucha $${(feeUsd * pct / 100).toFixed(4)} (${pct}%)\nHucha total: $${u.cashbackUsd.toFixed(4)} · Racha: ${u.streak || 0} días\n${w}`);
      return cors(res, 200, { ok: true, cashbackUsd: +u.cashbackUsd.toFixed(4), pct, todaySwapUsd: +u.todaySwapUsd.toFixed(2), elegibleRacha: u.todaySwapUsd >= 1 });
    }

    if (b.action === 'racha') {
      if (u.lastSwapDay !== hoy || u.todaySwapUsd < 1) {
        return cors(res, 200, { ok: false, error: 'Para reclamar la racha de hoy necesitás un cambio real de mínimo $1 HOY', streak: u.streak || 0 });
      }
      u.streak = (u.lastClaimDay === ayerGT()) ? (u.streak || 0) + 1 : 1;
      u.lastClaimDay = hoy;
      data[w] = u;
      await guardar(data, sha, 'dragonrojo racha ' + w.slice(0, 8));
      const pct = pctDe(u.streak);
      return cors(res, 200, { ok: true, streak: u.streak, pct, msg: '¡Racha día ' + u.streak + '! El Dragón ahora te devuelve el ' + pct + '% de tus comisiones' });
    }

    if (b.action === 'reclamar') {
      if (u.cashbackUsd < 0.01) return cors(res, 200, { ok: false, error: 'Todavía no hay nada en la hucha. Cambiá para empezar a acumular.' });
      u.pendingUsd = (u.pendingUsd || 0) + u.cashbackUsd;
      const monto = u.cashbackUsd;
      u.cashbackUsd = 0;
      data[w] = u;
      await guardar(data, sha, 'dragonrojo reclamo ' + w.slice(0, 8));
      await aviso(`🔥 DRAGÓN ROJO — RECLAMO DE HUCHA\n@${u.handle || 'usuario'} reclama $${monto.toFixed(4)}\nWallet: ${w}\nPagar a mano (igual que premios de volumen)`);
      return cors(res, 200, { ok: true, msg: '¡Reclamado! $' + monto.toFixed(4) + ' en camino. El Dragón te paga en breve.', pendingUsd: +u.pendingUsd.toFixed(4) });
    }

    return cors(res, 400, { ok: false, error: 'accion desconocida' });
  } catch (e) { return cors(res, 500, { ok: false, error: e.message }); }
}
