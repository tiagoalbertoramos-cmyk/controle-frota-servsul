const nodemailer = require('nodemailer');

const PROJECT_ID = 'modo-produ';
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fsGet(path) {
  const res = await fetch(`${FS_BASE}/${path}?key=AIzaSyDmwMFS8dIVmwbbVvSi9o1RcqBYPQMe2eU`);
  if (!res.ok) return null;
  return res.json();
}

function fsValue(field) {
  if (!field) return null;
  if (field.stringValue  !== undefined) return field.stringValue;
  if (field.integerValue  !== undefined) return Number(field.integerValue);
  if (field.doubleValue   !== undefined) return Number(field.doubleValue);
  if (field.booleanValue  !== undefined) return field.booleanValue;
  if (field.arrayValue)  return (field.arrayValue.values || []).map(fsValue);
  if (field.mapValue)    return fsMap(field.mapValue.fields || {});
  return null;
}

function fsMap(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {})) obj[k] = fsValue(v);
  return obj;
}

function parseDateBR(str) {
  if (!str) return null;
  const [dd, mm, yyyy] = (str || '').split('/');
  if (!dd || !mm || !yyyy) return null;
  return new Date(+yyyy, +mm - 1, +dd);
}

function fmt(d) { return d.toLocaleDateString('pt-BR'); }

function moeda(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); }

async function lerDados() {
  const [settingsDoc, reqDoc] = await Promise.all([
    fsGet('sv_data/settings'),
    fsGet('sv_data/requisicoes'),
  ]);

  const settings   = fsMap(settingsDoc?.fields || {});
  const veiculos   = settings.vehicles  || [];
  const motoristas = settings.drivers   || [];

  const reqRaw  = fsMap(reqDoc?.fields || {});
  const todasReqs = Array.isArray(reqRaw.list) ? reqRaw.list : [];

  return { veiculos, motoristas, todasReqs };
}

async function gerarRelatorio() {
  const agora = new Date();
  const ini   = new Date(agora); ini.setDate(agora.getDate() - 7);

  const { veiculos, motoristas, todasReqs: todas } = await lerDados();

  const todasReqs = todas.filter(r => {
    const d = parseDateBR(r.date);
    return d && d >= ini && d <= agora;
  });

  const autorizadas = todasReqs.filter(r => r.status === 'Autorizada').length;
  const pendentes   = todasReqs.filter(r => r.status === 'Pendente').length;
  const comComp     = todasReqs.filter(r => r.comprovante).length;
  const totalValor  = todasReqs.reduce((s, r) => s + (parseFloat(r.valor)  || 0), 0);
  const totalLitros = todasReqs.reduce((s, r) => s + (parseFloat(r.litros) || 0), 0);

  const porVeiculo = {};
  todasReqs.forEach(r => {
    const pl = r.placa || r.veiculo || '—';
    if (!porVeiculo[pl]) porVeiculo[pl] = { qtd: 0, valor: 0, litros: 0 };
    porVeiculo[pl].qtd++;
    porVeiculo[pl].valor  += parseFloat(r.valor)  || 0;
    porVeiculo[pl].litros += parseFloat(r.litros) || 0;
  });

  const rowsVeic = Object.entries(porVeiculo).map(([pl, d]) =>
    `<tr><td>${pl}</td><td align="center">${d.qtd}</td><td align="right">${moeda(d.valor)}</td><td align="right">${d.litros.toFixed(1).replace('.', ',')} L</td></tr>`
  ).join('') || `<tr><td colspan="4" style="color:#999;text-align:center">Nenhuma movimentação</td></tr>`;

  const rowsReqs = todasReqs.slice(0, 20).map(r => {
    const cor = r.status === 'Autorizada' ? '#1B5E20' : r.status === 'Pendente' ? '#F57F17' : '#555';
    const bg  = r.status === 'Autorizada' ? '#E8F5E9' : r.status === 'Pendente' ? '#FFF8E1' : '#f5f5f5';
    return `<tr>
      <td>${r.date || '—'}</td>
      <td>${r.motorista || '—'}</td>
      <td>${r.placa || r.veiculo || '—'}</td>
      <td align="center"><span style="padding:2px 8px;border-radius:10px;font-size:11px;background:${bg};color:${cor};font-weight:600">${r.status || '—'}</span></td>
      <td align="right">${moeda(r.valor)}</td>
      <td align="center">${r.comprovante ? '✔' : '—'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="color:#999;text-align:center">Nenhuma requisição no período</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
body{font-family:Arial,sans-serif;color:#333;background:#f0f0f0;margin:0;padding:20px 0}
.wrap{max-width:660px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
.hdr{background:#1B5E20;color:#fff;padding:28px 32px}
.hdr h1{margin:0;font-size:22px;font-weight:700;letter-spacing:-.3px}
.hdr p{margin:6px 0 0;font-size:13px;opacity:.75}
.body{padding:24px 32px}
.cards{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px}
.card{flex:1;min-width:100px;background:#F1F8E9;border-radius:8px;padding:12px 14px;text-align:center}
.card .v{font-size:22px;font-weight:700;color:#1B5E20;line-height:1.2}
.card .l{font-size:10px;color:#555;margin-top:3px;text-transform:uppercase;letter-spacing:.3px}
h2{font-size:14px;font-weight:700;color:#1B5E20;border-bottom:2px solid #E8F5E9;padding-bottom:6px;margin:20px 0 10px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#1B5E20;color:#fff;padding:7px 10px;text-align:left;font-weight:600}
td{padding:7px 10px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
.alert{background:#FFF8E1;border-left:4px solid #FDD835;padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:13px}
.footer{background:#f5f5f5;padding:14px 32px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee}
</style>
</head><body>
<div class="wrap">
  <div class="hdr">
    <h1>📊 Relatório Semanal — Frota SERVSUL</h1>
    <p>Período: ${fmt(ini)} até ${fmt(agora)}</p>
  </div>
  <div class="body">
    ${pendentes > 0 ? `<div class="alert">⚠ <strong>${pendentes} requisição(ões) pendente(s)</strong> aguardando autorização.</div>` : ''}

    <div class="cards">
      <div class="card"><div class="v">${todasReqs.length}</div><div class="l">Requisições</div></div>
      <div class="card"><div class="v">${autorizadas}</div><div class="l">Autorizadas</div></div>
      <div class="card"><div class="v">${comComp}</div><div class="l">Com comprovante</div></div>
      <div class="card"><div class="v">${moeda(totalValor)}</div><div class="l">Total gasto</div></div>
      <div class="card"><div class="v">${totalLitros.toFixed(0)} L</div><div class="l">Total litros</div></div>
    </div>

    <h2>Consumo por veículo</h2>
    <table>
      <tr><th>Veículo / Placa</th><th align="center">Req.</th><th align="right">Valor</th><th align="right">Litros</th></tr>
      ${rowsVeic}
    </table>

    <h2>Requisições do período</h2>
    <table>
      <tr><th>Data</th><th>Motorista</th><th>Veículo</th><th align="center">Status</th><th align="right">Valor</th><th align="center">Comp.</th></tr>
      ${rowsReqs}
    </table>
    ${todasReqs.length > 20 ? `<p style="font-size:11px;color:#aaa;margin-top:6px">+${todasReqs.length - 20} registro(s) omitidos. Acesse o app para ver todos.</p>` : ''}

    <p style="margin-top:20px;font-size:12px;color:#777">
      Frota: <strong>${veiculos.length} veículo(s)</strong> cadastrado(s) •
      Motoristas: <strong>${motoristas.length}</strong>
    </p>
  </div>
  <div class="footer">
    Gerado automaticamente toda segunda-feira às 8h<br>
    <a href="https://controle-frota-servsul.vercel.app" style="color:#1B5E20;text-decoration:none">controle-frota-servsul.vercel.app</a>
  </div>
</div>
</body></html>`;

  return { html, todasReqs, autorizadas, pendentes, totalValor, totalLitros, ini, fim: agora };
}

module.exports = async function handler(req, res) {
  const isCron   = req.headers['x-vercel-cron'] === '1';
  const secret   = req.query.secret || req.headers['x-cron-secret'];
  const isManual = secret === process.env.CRON_SECRET;

  if (!isCron && !isManual) {
    return res.status(401).json({ error: 'Não autorizado. Informe ?secret=SEU_CRON_SECRET' });
  }

  try {
    const { html, todasReqs, autorizadas, pendentes, totalValor, ini, fim } = await gerarRelatorio();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from:    `"Frota SERVSUL" <${process.env.GMAIL_USER}>`,
      to:      'comprasservsul@gmail.com',
      subject: `📊 Relatório Semanal Frota SERVSUL — ${fmt(fim)}`,
      html,
    });

    return res.status(200).json({
      ok:          true,
      mensagem:    'Relatório enviado para comprasservsul@gmail.com',
      periodo:     `${fmt(ini)} a ${fmt(fim)}`,
      requisicoes: todasReqs.length,
      autorizadas,
      pendentes,
      totalValor:  moeda(totalValor),
      messageId:   info.messageId,
    });
  } catch (err) {
    console.error('[relatorio-semanal]', err);
    return res.status(500).json({ error: err.message });
  }
};

function fmt(d) { return d?.toLocaleDateString?.('pt-BR') ?? '—'; }
function moeda(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); }
