'use strict';
/* ============================================================
 * COUVA — Servicio de Inspección Pre-Entrega (PDI)
 * - App PWA:        /            (estática, offline, se instala)
 * - API privada:    /api/*       (login por token; mismo hash del panel)
 * - Medios:         /media/<id>/*  (fotos/audio en el VPS)
 * - Reporte público:/r/<id>      (limpio, para el cliente + PDF)
 * Almacenamiento: 1 JSON por inspección + archivos de medios. Sin BD.
 * ============================================================ */
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const SITE = (process.env.SITE_URL || 'https://couva.oscaromargp.xyz').replace(/\/$/, '');
const ADMIN_USER = process.env.ADMIN_USER || 'oscaromargp';
const ADMIN_HASH = (process.env.ADMIN_HASH || '').toLowerCase();
const SECRET = process.env.APP_SECRET || 'cambia-esto';
const DATA_DIR = process.env.DATA_DIR || '/data';
const INSP_DIR = path.join(DATA_DIR, 'inspecciones');
fs.mkdirSync(INSP_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '4mb' }));

/* ---------- helpers ---------- */
const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const tokenValue = () => crypto.createHmac('sha256', SECRET).update(ADMIN_USER + ':pdi').digest('hex');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rid = (n = 10) => crypto.randomBytes(16).toString('hex').slice(0, n);
const safeId = (s) => /^[a-f0-9]{6,20}$/.test(String(s || ''));

function auth(req, res, next) {
  const t = req.get('x-app-token') || '';
  try { if (t && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(tokenValue()))) return next(); } catch {}
  return res.status(401).json({ error: 'auth' });
}
const inspPath = (id) => path.join(INSP_DIR, id + '.json');
function readInsp(id) { try { return JSON.parse(fs.readFileSync(inspPath(id), 'utf8')); } catch { return null; } }
function writeInsp(o) { fs.writeFileSync(inspPath(o.id), JSON.stringify(o, null, 2)); }
function listInsp() {
  return fs.readdirSync(INSP_DIR).filter((f) => f.endsWith('.json'))
    .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(INSP_DIR, f), 'utf8')); } catch { return null; } })
    .filter(Boolean).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

const CAUSAS = { fabrica: 'Origen en Fábrica', transporte: 'Vibración / Transporte', montaje: 'Maniobra de Montaje / Izaje', faltante: 'Incompletitud / Omisión de Obra' };
const CRIT = { baja: 'Baja · Detalle estético', media: 'Media · Requiere ajuste', critica: 'Crítica · Bloqueante' };
const CRIT_COLOR = { baja: '#2f855a', media: '#b7791f', critica: '#c53030' };

function metrics(insp) {
  let items = 0, ok = 0;
  (insp.stages || []).forEach((s) => (s.items || []).forEach((it) => { if (it.ok !== null && it.ok !== undefined) { items++; if (it.ok) ok++; } }));
  const inc = insp.incidents || [];
  const costo = inc.reduce((a, i) => a + (Number(i.costo) || 0), 0);
  const faltantes = inc.filter((i) => i.causa === 'faltante');
  const reparar = inc.filter((i) => i.causa !== 'faltante');
  const criticas = inc.filter((i) => i.criticidad === 'critica').length;
  return {
    revisados: items, aprobados: ok, aprobacion: items ? Math.round((ok / items) * 100) : 0,
    incidencias: inc.length, criticas,
    costoTotal: costo,
    costoReparar: reparar.reduce((a, i) => a + (Number(i.costo) || 0), 0),
    costoFaltantes: faltantes.reduce((a, i) => a + (Number(i.costo) || 0), 0),
    nReparar: reparar.length, nFaltantes: faltantes.length,
  };
}
const money = (n) => '$' + (Number(n) || 0).toLocaleString('es-MX');

/* ---------- API ---------- */
app.post('/api/login', (req, res) => {
  const { user, password } = req.body || {};
  if (user === ADMIN_USER && ADMIN_HASH && sha256(password) === ADMIN_HASH) return res.json({ token: tokenValue() });
  res.status(401).json({ error: 'bad_credentials' });
});
app.get('/api/inspections', auth, (req, res) => {
  res.json(listInsp().map((i) => ({ id: i.id, folio: i.folio, status: i.status, header: i.header, updatedAt: i.updatedAt, m: metrics(i) })));
});
app.get('/api/inspections/:id', auth, (req, res) => {
  if (!safeId(req.params.id)) return res.status(400).json({ error: 'id' });
  const i = readInsp(req.params.id); return i ? res.json(i) : res.status(404).json({ error: 'not_found' });
});
app.post('/api/inspections', auth, (req, res) => {
  const b = req.body || {};
  const now = new Date().toISOString();
  let id = b.id && safeId(b.id) ? b.id : null;
  const prev = id ? readInsp(id) : null;
  if (!id) { id = rid(12); }
  const folio = (prev && prev.folio) || b.folio || ('PDI-' + new Date().getFullYear() + '-' + id.slice(0, 5).toUpperCase());
  const insp = {
    id, folio,
    status: b.status === 'publicado' ? 'publicado' : 'borrador',
    header: b.header || {},
    stages: Array.isArray(b.stages) ? b.stages : [],
    incidents: Array.isArray(b.incidents) ? b.incidents : [],
    createdAt: (prev && prev.createdAt) || now,
    updatedAt: now,
    publishedAt: b.status === 'publicado' ? ((prev && prev.publishedAt) || now) : (prev ? prev.publishedAt || '' : ''),
  };
  fs.mkdirSync(path.join(INSP_DIR, id, 'media'), { recursive: true });
  writeInsp(insp);
  res.json({ ok: true, id, folio, url: `${SITE}/r/${id}` });
});
app.delete('/api/inspections/:id', auth, (req, res) => {
  if (!safeId(req.params.id)) return res.status(400).json({ error: 'id' });
  try { fs.rmSync(path.join(INSP_DIR, req.params.id + '.json'), { force: true }); fs.rmSync(path.join(INSP_DIR, req.params.id), { recursive: true, force: true }); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'del' }); }
});

/* ---------- medios ---------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { const d = path.join(INSP_DIR, req.params.id, 'media'); fs.mkdirSync(d, { recursive: true }); cb(null, d); },
    filename: (req, file, cb) => { const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, ''); cb(null, Date.now().toString(36) + '-' + rid(6) + ext); },
  }),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^(image|audio|video)\//.test(file.mimetype)),
});
app.post('/api/inspections/:id/media', auth, (req, res, next) => { if (!safeId(req.params.id)) return res.status(400).json({ error: 'id' }); next(); }, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  res.json({ url: `/media/${req.params.id}/${req.file.filename}` });
});
app.use('/media', express.static(INSP_DIR, { maxAge: '30d', immutable: true, index: false }));

/* ---------- reporte público ---------- */
app.get('/r/:id', (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  if (!safeId(req.params.id)) return res.status(404).send(reportShell('No encontrado', '<p>Reporte no válido.</p>'));
  const insp = readInsp(req.params.id);
  if (!insp || insp.status !== 'publicado') return res.status(404).send(reportShell('No disponible', '<p>Este reporte no existe o aún no se publica.</p>'));
  res.send(renderReport(insp));
});

app.get('/healthz', (req, res) => res.send('ok'));
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));
// fallback SPA: cualquier ruta no-API sirve la app
app.get(/^\/(?!api|media|r\/|healthz).*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log('couva-inspeccion on :' + PORT));

/* ============================================================
 * Render del reporte público (limpio, imprimible, con PDF)
 * ============================================================ */
function reportShell(title, body) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f5f7;color:#1a1c1e;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:20px}</style>
</head><body><div>${body}</div></body></html>`;
}

function renderReport(insp) {
  const h = insp.header || {};
  const m = metrics(insp);
  const inc = insp.incidents || [];
  const incCards = inc.map((i, n) => {
    const fotos = (i.media || []).filter((x) => (x.tipo || 'foto') === 'foto');
    const audios = (i.media || []).filter((x) => x.tipo === 'audio');
    const gal = fotos.map((f) => `<img src="${esc(f.url)}" alt="Evidencia" loading="lazy" onclick="zoom(this.src)">`).join('');
    const aud = audios.map((a) => `<audio controls src="${esc(a.url)}"></audio>`).join('');
    return `<article class="card">
      <div class="chead">
        <span class="num">#${n + 1}</span>
        <span class="badge" style="background:${CRIT_COLOR[i.criticidad] || '#666'}">${esc(CRIT[i.criticidad] || i.criticidad || '')}</span>
        <span class="causa">${esc(CAUSAS[i.causa] || i.causa || '')}</span>
        ${i.costo ? `<span class="costo">${money(i.costo)}</span>` : ''}
      </div>
      <div class="ubic">📍 ${esc(i.ubicacion || 'Sin ubicación')}</div>
      ${i.descripcion ? `<p class="desc"><b>Falla:</b> ${esc(i.descripcion)}</p>` : ''}
      ${i.solucion ? `<p class="sol"><b>Solución propuesta:</b> ${esc(i.solucion)}</p>` : ''}
      ${gal ? `<div class="gal">${gal}</div>` : ''}
      ${aud ? `<div class="aud">${aud}</div>` : ''}
    </article>`;
  }).join('');

  const stagesDone = (insp.stages || []).map((s) => {
    const total = (s.items || []).length;
    const ok = (s.items || []).filter((it) => it.ok).length;
    return `<div class="stage"><span>${esc(s.nombre)}</span><b>${ok}/${total}</b></div>`;
  }).join('');

  return `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Reporte PDI ${esc(insp.folio)} — COUVA</title>
<style>
:root{--ink:#0B1F2A;--gold:#C9A24B;--line:#e2e5e9}
*{box-sizing:border-box}body{margin:0;background:#eceef1;color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55}
.sheet{max-width:820px;margin:20px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 40px -20px rgba(0,0,0,.4)}
.hd{background:var(--ink);color:#fff;padding:26px 28px}
.hd .t{font-size:13px;letter-spacing:.15em;color:var(--gold);font-weight:700;text-transform:uppercase}
.hd h1{margin:.2em 0 .1em;font-size:26px}
.hd .folio{font-size:14px;opacity:.8}
.ficha{display:grid;grid-template-columns:repeat(2,1fr);gap:2px 24px;padding:18px 28px;background:#f7f8fa;font-size:14px}
.ficha div{padding:4px 0;border-bottom:1px solid var(--line)}.ficha b{color:#5a6570}
.decl{padding:14px 28px;font-size:13px;color:#41505a;background:#fffdf5;border-left:4px solid var(--gold)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:22px 28px}
.kpi{background:#f7f8fa;border:1px solid var(--line);border-radius:12px;padding:12px;text-align:center}
.kpi .v{font-size:24px;font-weight:800}.kpi .l{font-size:11px;color:#6b7681;text-transform:uppercase;letter-spacing:.05em}
.split{display:flex;gap:12px;padding:0 28px 8px}.split .b{flex:1;border-radius:10px;padding:10px 14px;font-size:13px}
.b.rep{background:#fef3f2;color:#b42318}.b.fal{background:#fef8e7;color:#8a5a00}
h2.sec{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#6b7681;margin:24px 28px 6px}
.stages{padding:0 28px}.stage{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px}
.cards{padding:6px 28px 28px;display:grid;gap:14px}
.card{border:1px solid var(--line);border-radius:12px;padding:14px}
.chead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.num{font-weight:800;color:#9aa4ad}.badge{color:#fff;font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px}
.causa{font-size:12px;color:#6b7681}.costo{margin-left:auto;font-weight:800;color:var(--ink)}
.ubic{margin:8px 0 4px;font-weight:600;font-size:14px}
.desc,.sol{margin:4px 0;font-size:14px}.sol{color:#1a5e3a}
.gal{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.gal img{width:120px;height:90px;object-fit:cover;border-radius:8px;cursor:zoom-in}
.aud{margin-top:10px}.aud audio{width:100%}
.foot{padding:20px 28px;color:#8b95a0;font-size:12px;text-align:center;border-top:1px solid var(--line)}
.bar{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:10px;padding:10px;background:rgba(255,255,255,.85);backdrop-filter:blur(6px)}
.btn{background:var(--ink);color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:600;cursor:pointer;font-size:14px}
#lb{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;place-items:center;z-index:50;cursor:zoom-out}#lb img{max-width:94%;max-height:94%}
@media print{.bar{display:none}body{background:#fff}.sheet{box-shadow:none;margin:0}}
@media(max-width:640px){.ficha,.kpis{grid-template-columns:1fr 1fr}.split{flex-direction:column}}
</style></head><body>
<div class="bar"><button class="btn" onclick="dl()">⬇ Descargar PDF</button></div>
<div class="sheet" id="sheet">
  <div class="hd"><div class="t">Reporte de Inspección Pre-Entrega</div><h1>Casa Modular ${esc(h.modelo || 'COUVA')}</h1><div class="folio">Folio ${esc(insp.folio)}</div></div>
  <div class="ficha">
    <div><b>Modelo:</b> ${esc(h.modelo || 'COUVA')}</div>
    <div><b>N° Lote/Serie:</b> ${esc(h.serie || '—')}</div>
    <div><b>Ubicación:</b> ${esc(h.ubicacion || '—')}</div>
    <div><b>Cliente/Supervisor:</b> ${esc(h.cliente || '—')}</div>
    <div><b>Inspector:</b> ${esc(h.inspector || '—')}</div>
    <div><b>Fecha:</b> ${esc(h.fecha || (insp.publishedAt || '').slice(0, 10))}</div>
  </div>
  <div class="decl">Inspección realizada bajo la norma de <b>6 etapas de control modular COUVA</b> (cimentación, estructura, envolvente, servicios MEPH, interiores y prueba dinámica).</div>
  <div class="kpis">
    <div class="kpi"><div class="v">${m.aprobacion}%</div><div class="l">Aprobación</div></div>
    <div class="kpi"><div class="v">${m.revisados}</div><div class="l">Puntos revisados</div></div>
    <div class="kpi"><div class="v">${m.incidencias}</div><div class="l">Incidencias</div></div>
    <div class="kpi"><div class="v">${money(m.costoTotal)}</div><div class="l">Costo total</div></div>
  </div>
  <div class="split">
    <div class="b rep"><b>${m.nReparar}</b> fallas a reparar · ${money(m.costoReparar)}</div>
    <div class="b fal"><b>${m.nFaltantes}</b> faltantes de obra · ${money(m.costoFaltantes)}</div>
  </div>
  ${stagesDone ? `<h2 class="sec">Etapas de control</h2><div class="stages">${stagesDone}</div>` : ''}
  <h2 class="sec">Incidencias detectadas (${inc.length})</h2>
  <div class="cards">${incCards || '<p style="color:#6b7681">Sin incidencias registradas. ✅</p>'}</div>
  <div class="foot">Generado por el sistema de inspección COUVA · PardeSantos · ${esc((insp.publishedAt || '').slice(0, 10))}</div>
</div>
<div id="lb" onclick="this.style.display='none'"><img id="lbi" src=""></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
function zoom(s){document.getElementById('lbi').src=s;document.getElementById('lb').style.display='grid';}
function dl(){var el=document.getElementById('sheet');html2pdf().set({margin:0,filename:'Reporte-${esc(insp.folio)}.pdf',image:{type:'jpeg',quality:.95},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'pt',format:'a4'}}).from(el).save();}
</script>
</body></html>`;
}
