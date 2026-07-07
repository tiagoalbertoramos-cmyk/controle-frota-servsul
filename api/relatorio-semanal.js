const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

function semanaAtual() {
  const now = new Date();
  const ini = new Date(now);
  ini.setDate(now.getDate() - 7);
  return { ini, fim: now };
}

function fmt(d) {
  return d.toLocaleDateString('pt-BR');
}

function parseDateBR(str) {
  if (!str) return null;
  const [dd, mm, yyyy] = (str || '').split('/');
  if (!dd || !mm || !yyyy) return null;
  return new Date(+yyyy, +mm - 1, +dd);
}

async function gerarRelatorio() {
  const { ini, fim } = semanaAtual();

  const [settingsSnap, reqSnap, fuelSnap] = await Promise.all([
    db.collection('sv_data').doc('settings').get(),
    db.collection('sv_data').doc('requisicoes').get(),
    db.collection('sv_data').doc('fuel').get(),
  ]);

  const settings  = settingsSnap.data() || {};
  const veiculos  = settings.vehicles || [];
  const motoristas = settings.drivers || [];

  const todasReqs = (reqSnap.data()?.list || []).filter(r => {
    const d = parseDateBR(r.date);
    return d && d >= ini && d <= fim;
  });

  const fuelEntries = (fuelSnap.data()?.entries || []).filter(e => {
    const d = parseDateBR(e.date);
    return d && d >= ini && d <= fim;
  });

  const autorizadas  = todasReqs.filter(r => r.status === 'Autorizada').length;
  const pendentes    = todasReqs.filter(r => r.status === 'Pendente').length;
  const comComp      = todasReqs.filter(r => r.comprovante).length;
  const totalValor   = todasReqs.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
  const totalLitros  = todasReqs.reduce((s, r) => s + (parseFloat(r.litros) || 0), 0);

  const porVeiculo = {};
  todasReqs.forEach(r => {
    const pl = r.placa || r.veiculo || '—';
    if (!porVeiculo[pl]) porVeiculo[pl] = { qtd: 0, valor: 0, litros: 0 };
    porVeiculo[pl].qtd++;
    porVeiculo[pl].valor  += parseFloat(r.valor)  || 0;
    porVeiculo[pl].litros += parseFloat(r.litros) || 0;
  });

  const rowsVeic = Object.entries(porVeiculo).map(([pl, d]) =>
    `<tr><td>${pl}</td><td style="text-align:center">${d.qtd}</td><td style="text-align:right">R$ ${d.valor.toFixed(2).replace('.',',')}</td><td style="text-align:right">${d.litros.toFixed(1).replace('.',',')} L</td></tr>`
  ).join('') || '<tr><td colspan="4" style="color:#999;text-align:center">Nenhuma movimentação</td></tr>';

  const rowsReqs = todasReqs.slice(0, 15).map(r =>
    `<tr>
      <td>${r.date || '—'}</td>
      <td>${r.motorista || '—'}</td>
      <td>${r.placa || r.veiculo || '—'}</td>
      <td style="text-align:center"><span style="padding:2px 8px;border-radius:10px;font-size:11px;background:${r.status==='Autorizada'?'#E8F5E9':'#FFF8E1'};color:${r.status==='Autorizada'?'#1B5E20':'#F57F17'}">${r.status}</span></td>
      <td style="text-align:right">R$ ${(parseFloat(r.valor)||0).toFixed(2).replace('.',',')}</td>
    </tr>`
  ).join('') || '<tr><td colspan="5" style="color:#999;text-align:center">Nenhuma requisição</td></tr>';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;color:#333;background:#f5f5f5;margin:0;padding:0}
  .wrap{max-width:640px;margin:0 auto;background:#fff}
  .header{background:#1B5E20;color:#fff;padding:28px 32px}
  .header h1{margin:0;font-size:22px;font-weight:700}
  .header p{margin:6px 0 0;font-size:13px;opacity:.8}
  .body{padding:24px 32px}
  .cards{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
  .card{flex:1;min-width:120px;background:#F1F8E9;border-radius:8px;padding:14px 16px;text-align:center}
  .card .val{font-size:24px;font-weight:700;color:#1B5E20}
  .card .lbl{font-size:11px;color:#555;margin-top:2px}
  h2{font-size:15px;color:#1B5E20;border-bottom:2px solid #E8F5E9;padding-bottom:6px;margin:20px 0 12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1B5E20;color:#fff;padding:8px 10px;text-align:left;font-weight:600}
  td{padding:7px 10px;border-bottom:1px solid #f0f0f0}
  tr:hover td{background:#f9f9f9}
  .footer{background:#f5f5f5;padding:16px 32px;font-size:11px;color:#999;text-align:center}
  .badge-alert{background:#FFF8E1;border-left:4px solid #FDD835;padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:13px}
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Relatório Semanal — Controle de Frota</h1>
    <p>SERVSUL • Período: ${fmt(ini)} a ${fmt(fim)}</p>
  </div>
  <div class="body">
    ${pendentes > 0 ? `<div class="badge-alert">⚠ <strong>${pendentes} requisição(ões) ainda pendente(s)</strong> de autorização esta semana.</div>` : ''}
    <div class="cards">
      <div class="card"><div class="val">${todasReqs.length}</div><div class="lbl">Requisições</div></div>
      <div class="card"><div class="val">${autorizadas}</div><div class="lbl">Autorizadas</div></div>
      <div class="card"><div class="val">${comComp}</div><div class="lbl">Com comprovante</div></div>
      <div class="card"><div class="val">R$ ${totalValor.toFixed(2).replace('.',',')}</div><div class="lbl">Total gasto</div></div>
      <div class="card"><div class="val">${totalLitros.toFixed(1).replace('.',',')} L</div><div class="lbl">Total litros</div></div>
    </div>

    <h2>Por veículo</h2>
    <table>
      <tr><th>Veículo/Placa</th><th style="text-align:center">Req.</th><th style="text-align:right">Valor</th><th style="text-align:right">Litros</th></tr>
      ${rowsVeic}
    </table>

    <h2>Requisições da semana</h2>
    <table>
      <tr><th>Data</th><th>Motorista</th><th>Veículo</th><th style="text-align:center">Status</th><th style="text-align:right">Valor</th></tr>
      ${rowsReqs}
    </table>
    ${todasReqs.length > 15 ? `<p style="font-size:11px;color:#999;margin-top:8px">+ ${todasReqs.length-15} registro(s) omitido(s). Acesse o app para ver tudo.</p>` : ''}

    <p style="margin-top:24px;font-size:13px;color:#555">
      Frota cadastrada: <strong>${veiculos.length} veículo(s)</strong> •
      Motoristas: <strong>${motoristas.length}</strong>
    </p>
  </div>
  <div class="footer">
    Gerado automaticamente pelo app Controle de Frota SERVSUL<br>
    <a href="https://controle-frota-servsul.vercel.app" style="color:#1B5E20">controle-frota-servsul.vercel.app</a>
  </div>
</div>
</body></html>`;

  return { html, todasReqs, autorizadas, pendentes, totalValor, totalLitros, ini, fim };
}

module.exports = async function handler(req, res) {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  const isCron = req.headers['x-vercel-cron'] === '1';

  if (!isCron && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' });
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

    await transporter.sendMail({
      from:    `"Frota SERVSUL" <${process.env.GMAIL_USER}>`,
      to:      'comprasservsul@gmail.com',
      subject: `📊 Relatório Semanal Frota SERVSUL — ${new Date().toLocaleDateString('pt-BR')}`,
      html,
    });

    return res.status(200).json({
      ok: true,
      msg: 'Relatório enviado com sucesso!',
      periodo: `${ini.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`,
      requisicoes: todasReqs.length,
      autorizadas,
      pendentes,
      totalValor: totalValor.toFixed(2),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
