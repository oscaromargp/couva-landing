/* ============================================================
 * COUVA PDI — App de inspección (vanilla, offline-first)
 * ============================================================ */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
let TOKEN = localStorage.getItem('pdi_token') || '';
let cur = null;        // inspección en edición
let step = 0;          // etapa activa del wizard
let incEdit = null;    // incidencia en edición (o null)
let mediaRec = null;   // MediaRecorder activo
let _gps = null;       // ubicación GPS capturada {lat,lng,acc}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => '$' + (Number(n) || 0).toLocaleString('es-MX');
const online = () => navigator.onLine;

const CAUSAS = { fabrica: 'Origen en Fábrica', transporte: 'Vibración / Transporte', montaje: 'Maniobra de Montaje / Izaje', faltante: 'Incompletitud / Omisión de Obra' };
const CRIT = { baja: 'Baja · Estético', media: 'Media · Ajuste', critica: 'Crítica · Bloqueante' };
const STAGES = [
  { id: 'e1', nombre: '1. Cimentación, apoyos y nivelación', items: ['Nivelación láser correcta (plomo, sin asentamiento)', 'Apoyos / pilotes / dados firmes y completos', 'Base aislada de la humedad del terreno', 'Sin asentamientos diferenciales entre módulos'] },
  { id: 'e2', nombre: '2. Estructura y chasis', items: ['Bastidor de acero sin abolladuras graves ni óxido profundo', 'Puntos de izaje y esquinas alineados y firmes', 'Pernos de unión entre módulos torqueados', 'Soldaduras sin fisuras ni daños por izaje/vibración', 'Estructura sin torsión ni deformación'] },
  { id: 'e3', nombre: '3. Envolvente: paredes, techo, aislamiento y sellado', items: ['Paneles sándwich (EPS/lana de roca) sin golpes ni perforaciones', 'Cubierta/techo sellado en canales y juntas de desagüe pluvial', 'Sin filtraciones de luz ni agua en uniones de módulos', 'Sellado de silicona perimetral completo', 'Revestimiento interior sin humedad, grietas ni abolladuras'] },
  { id: 'e4', nombre: '4. Pisos y zócalos', items: ['Piso (SPC/fibrocemento) firme, sin hundimientos', 'Sin rayones profundos, burbujas ni piezas sueltas', 'Zócalos instalados uniformes y sellados en los bordes'] },
  { id: 'e5', nombre: '5. Puertas, ventanas y cancelería', items: ['Puerta principal e interiores abren/cierran sin fricción', 'Chapas, manijas y cerrojos operan con su llave', 'Ventanas (aluminio/DVH) selladas y sin roturas en cristales', 'Mosquiteros / persianas (si aplica) funcionales'] },
  { id: 'e6', nombre: '6. Instalación eléctrica', items: ['Tablero con interruptores termomagnéticos rotulados', 'Contactos, apagadores y salidas de luz operativas', 'Luminarias LED interiores y exteriores funcionando', 'Conexión a tierra visible y segura'] },
  { id: 'e7', nombre: '7. Instalaciones sanitarias y grifería', items: ['Agua fría y caliente sin fugas ni goteos', 'Inodoro, lavabo y ducha instalados y bien anclados', 'Drenaje: cespol y bajantes conectados al registro, sin obstrucción'] },
  { id: 'e8', nombre: '8. Prueba dinámica de estrés', items: ['Presión de agua + carga eléctrica simultánea', 'Sin fallas bajo carga combinada', 'Puertas y ventanas operan con la casa en uso'] },
  { id: 'e9', nombre: '9. Inventario y documentación entregada', items: ['Planos eléctricos y sanitarios del módulo', 'Llaves de repuesto entregadas', 'Manuales de mantenimiento de equipos', 'Garantías de componentes (aire, luminarias, grifería)'] },
];
const CONCEPTOS = { aprobado: 'Aprobado sin observaciones', observaciones: 'Aprobado con observaciones menores', rechazado: 'Rechazado' };

/* ---------- utilidades UI ---------- */
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600); }
function topbar(title, back) {
  return `<div class="top">
    ${back ? `<button class="iconbtn" onclick="${back}">←</button>` : ''}
    <span class="brand">COU<b>VA</b> · PDI</span>
    <span class="sp"></span>
    <span class="${online() ? 'on' : 'off'}">${online() ? '● en línea' : '○ offline'}</span>
  </div>`;
}
async function api(path, opts) {
  opts = opts || {}; opts.headers = Object.assign({ 'x-app-token': TOKEN }, opts.headers || {});
  const r = await fetch('/api' + path, opts);
  if (r.status === 401) { logout(); throw new Error('401'); }
  return r;
}

/* ---------- métricas ---------- */
function metrics(ins) {
  let items = 0, ok = 0;
  ins.stages.forEach((s) => s.items.forEach((it) => { if (it.ok !== null) { items++; if (it.ok) ok++; } }));
  const inc = ins.incidents || [];
  const sum = (arr) => arr.reduce((a, i) => a + (Number(i.costo) || 0), 0);
  const rep = inc.filter((i) => i.causa !== 'faltante'), fal = inc.filter((i) => i.causa === 'faltante');
  return { revisados: items, aprobacion: items ? Math.round(ok / items * 100) : 0, incidencias: inc.length, criticas: inc.filter((i) => i.criticidad === 'critica').length, costoTotal: sum(inc), nRep: rep.length, cRep: sum(rep), nFal: fal.length, cFal: sum(fal) };
}

/* ---------- persistencia local ---------- */
async function saveLocal() { cur.updatedAt = new Date().toISOString(); cur.dirty = true; await DB.put('inspections', cur); }
function newInspection(header) {
  return {
    localId: uid(), id: null, folio: null, status: 'borrador', header,
    stages: STAGES.map((s) => ({ id: s.id, nombre: s.nombre, items: s.items.map((l, i) => ({ id: s.id + '-' + i, label: l, ok: null })) })),
    incidents: [], publicUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dirty: true,
  };
}

/* ============================================================
 * VISTAS
 * ============================================================ */
function render() { window.scrollTo(0, 0); }

/* --- Login --- */
function viewLogin() {
  app.innerHTML = topbar('') + `<div class="wrap center"><div style="width:100%;max-width:360px">
    <h1>Inspección pre-entrega</h1><p class="muted">Ingresa para crear reportes.</p>
    <label>Usuario</label><input id="u" value="oscaromargp" autocomplete="username">
    <label>Contraseña</label><input id="p" type="password" autocomplete="current-password">
    <p id="e" style="color:var(--bad);font-size:14px;min-height:18px"></p>
    <button class="btn p" onclick="doLogin()">Entrar</button>
  </div></div>`;
  render();
}
async function doLogin() {
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: $('#u').value, password: $('#p').value }) });
    const j = await r.json();
    if (r.ok && j.token) { TOKEN = j.token; localStorage.setItem('pdi_token', TOKEN); viewDashboard(); }
    else $('#e').textContent = 'Usuario o contraseña incorrectos.';
  } catch (e) { $('#e').textContent = 'Sin conexión. Intenta de nuevo.'; }
}
function logout() { localStorage.removeItem('pdi_token'); TOKEN = ''; viewLogin(); }

/* --- Dashboard --- */
async function viewDashboard() {
  const locs = (await DB.all('inspections')).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const cards = locs.map((i) => {
    const m = metrics(i);
    return `<div class="card tap" onclick="openInspection('${i.localId}')">
      <div class="row"><b>${esc(i.header.modelo || 'COUVA')}</b><span class="pill ${i.status}">${i.status}</span>
        <span class="sp"></span>${i.dirty ? '<span class="muted" style="font-size:12px">● sin sincronizar</span>' : ''}</div>
      <div class="muted" style="font-size:14px;margin-top:4px">${esc(i.folio || 'Borrador')} · ${esc(i.header.ubicacion || 's/ubicación')}</div>
      <div class="row" style="margin-top:8px;font-size:13px;color:var(--mut)">
        <span>✔ ${m.aprobacion}%</span><span>⚠ ${m.incidencias} inc.</span><span>${money(m.costoTotal)}</span></div>
    </div>`;
  }).join('');
  app.innerHTML = topbar('') + `<div class="wrap">
    <div class="row"><h1>Mis inspecciones</h1><span class="sp"></span><button class="iconbtn" title="Salir" onclick="logout()">⎋</button></div>
    <button class="btn gold" onclick="viewNew()">＋ Nueva inspección</button>
    <div style="margin-top:16px">${cards || '<p class="muted">Aún no hay inspecciones. Crea la primera.</p>'}</div>
  </div>`;
  render();
}

/* --- Nueva inspección: ficha de encabezado --- */
function viewNew() {
  _gps = null;
  const today = new Date().toISOString().slice(0, 10);
  app.innerHTML = topbar('', 'viewDashboard()') + `<div class="wrap">
    <h1>Datos de la casa</h1>
    <div class="card">
      <label>Modelo</label><input id="h_modelo" value="COUVA 6×6">
      <label>N° de Lote / Serie</label><input id="h_serie" placeholder="Ej. C6-2026-014">
      <label>Ubicación de la instalación</label><input id="h_ubicacion" placeholder="Ej. Puerto Escondido, Oax.">
      <label>Proveedor / Fabricante</label><input id="h_proveedor" value="PardeSantos">
      <label>Cliente / Supervisor (representante de entrega)</label><input id="h_cliente" placeholder="Nombre de quien recibe">
      <label>Responsable de la inspección</label><input id="h_inspector" value="Oscar Omar Gómez">
      <label>Ubicación GPS (dónde quedó instalada)</label>
      <div class="btnrow"><button class="btn g sm" type="button" onclick="capturaGPS()">📍 Capturar GPS</button><span id="gps_txt" class="muted" style="align-self:center;font-size:13px">sin capturar</span></div>
      <label>Fecha</label><input id="h_fecha" type="date" value="${today}">
    </div>
    <button class="btn p" onclick="createInspection()">Comenzar recorrido guiado →</button>
  </div>`;
  render();
}
async function createInspection() {
  const header = { modelo: $('#h_modelo').value, serie: $('#h_serie').value, ubicacion: $('#h_ubicacion').value, proveedor: $('#h_proveedor').value, cliente: $('#h_cliente').value, inspector: $('#h_inspector').value, fecha: $('#h_fecha').value, gps: _gps };
  if (!header.modelo) { toast('Indica el modelo'); return; }
  cur = newInspection(header); step = 0; await saveLocal(); viewWizard();
}
function capturaGPS() {
  if (!navigator.geolocation) { toast('Este dispositivo no tiene GPS'); return; }
  toast('Obteniendo ubicación…');
  navigator.geolocation.getCurrentPosition(
    (p) => { _gps = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy) }; const el = $('#gps_txt'); if (el) el.textContent = _gps.lat + ', ' + _gps.lng + ' (±' + _gps.acc + ' m)'; toast('Ubicación capturada'); },
    () => toast('No se pudo obtener el GPS (revisa permisos)'),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}
async function openInspection(localId) { cur = await DB.get('inspections', localId); step = 0; if (cur.status === 'publicado') viewReview(); else viewWizard(); }

/* --- Wizard de 6 etapas --- */
function stepsBar() {
  return `<div class="steps">${STAGES.map((s, i) => {
    const done = cur.stages[i].items.every((it) => it.ok !== null);
    return `<div class="s ${i === step ? 'act' : (done ? 'done' : '')}" onclick="gotoStep(${i})">${done && i !== step ? '✓' : (i + 1)}</div>`;
  }).join('')}</div>`;
}
function viewWizard() {
  const st = cur.stages[step];
  const items = st.items.map((it) => `<div class="item">
    <div class="lbl">${esc(it.label)}</div>
    <div class="acts">
      <button class="chk ${it.ok === true ? 'ok' : ''}" onclick="mark('${it.id}',true)">✔ Cumple</button>
      <button class="chk ${it.ok === false ? 'bad' : ''}" onclick="mark('${it.id}',false)">✖ Falla</button>
    </div>
  </div>`).join('');
  const incHere = cur.incidents.filter((i) => i.stage === st.id);
  app.innerHTML = topbar('', 'viewDashboard()') + stepsBar() + `<div class="wrap">
    <div class="stagehd">${esc(st.nombre)}</div>
    <div style="margin-top:10px">${items}</div>
    <button class="btn g" onclick="addIncident('${st.id}')">＋ Agregar incidencia libre / faltante</button>
    ${incHere.length ? `<h2 style="margin-top:18px">Incidencias de esta etapa</h2>${incHere.map(incCard).join('')}` : ''}
  </div>
  <div class="actionbar">
    ${step > 0 ? `<button class="btn g" onclick="gotoStep(${step - 1})">← Anterior</button>` : ''}
    ${step < STAGES.length - 1 ? `<button class="btn p" onclick="gotoStep(${step + 1})">Siguiente →</button>` : `<button class="btn gold" onclick="viewReview()">Revisar reporte →</button>`}
  </div>`;
  render();
}
async function gotoStep(i) { step = Math.max(0, Math.min(STAGES.length - 1, i)); await saveLocal(); viewWizard(); }
async function mark(itemId, ok) {
  const st = cur.stages[step]; const it = st.items.find((x) => x.id === itemId); it.ok = ok; await saveLocal();
  if (ok === false) { addIncident(st.id, it.label); } else { viewWizard(); }
}

/* --- Incidencia (modal) --- */
function incCard(i) {
  const nfotos = (i.media || []).filter((m) => m.tipo === 'foto').length;
  return `<div class="card tap" onclick="editIncident('${i.id}')">
    <div class="row"><span class="badge ${i.criticidad}">${esc(CRIT[i.criticidad] || '')}</span>
      ${i.estado && i.estado !== 'abierta' ? `<span class="pill ${i.estado === 'verificada' ? 'publicado' : 'borrador'}">${esc(i.estado)}</span>` : ''}
      <span class="sp"></span>${i.costo ? `<b>${money(i.costo)}</b>` : ''}</div>
    <div style="margin-top:6px;font-weight:600">📍 ${esc(i.ubicacion || 'Sin ubicación')}</div>
    <div class="muted" style="font-size:14px">${esc((i.descripcion || '').slice(0, 90))}</div>
    <div class="muted" style="font-size:12px;margin-top:4px">${esc(CAUSAS[i.causa] || '')}${nfotos ? ` · 📷 ${nfotos}` : ''}</div>
  </div>`;
}
function addIncident(stage, ubicPrefill) {
  incEdit = { id: uid(), stage: stage || cur.stages[step].id, ubicacion: ubicPrefill || '', causa: 'fabrica', criticidad: 'media', estado: 'abierta', descripcion: '', solucion: '', costo: '', media: [] };
  viewIncidentForm(true);
}
function editIncident(id) { incEdit = cur.incidents.find((x) => x.id === id); viewIncidentForm(false); }

function viewIncidentForm(isNew) {
  const i = incEdit;
  const opt = (o, sel) => Object.entries(o).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
  app.innerHTML = topbar('') + `<div class="wrap">
    <h1>${isNew ? 'Nueva incidencia' : 'Editar incidencia'}</h1>
    <div class="card">
      <label>Ubicación exacta</label><input id="i_ubic" value="${esc(i.ubicacion)}" placeholder="Cocina / Módulo A / bajo tarja">
      <label>Causa raíz</label><select id="i_causa">${opt(CAUSAS, i.causa)}</select>
      <label>Criticidad</label><select id="i_crit">${opt(CRIT, i.criticidad)}</select>
      <label>Descripción de la falla</label>
      <div class="row"><textarea id="i_desc" placeholder="Qué está mal…">${esc(i.descripcion)}</textarea></div>
      <button class="btn g sm" style="margin-top:6px" onclick="dictate('i_desc')">🎙️ Dictar</button>
      <label>Propuesta de solución</label><textarea id="i_sol" placeholder="Cómo se repara…">${esc(i.solucion)}</textarea>
      <label>Cotización estimada ($)</label><input id="i_costo" type="number" inputmode="numeric" value="${esc(i.costo)}" placeholder="0">
      <label>Estado</label><select id="i_estado">${opt({ abierta: 'Abierta (detectada)', reparada: 'Reparada', verificada: 'Verificada' }, i.estado || 'abierta')}</select>
      <label>Evidencia</label>
      <div class="btnrow">
        <label class="btn g sm" style="flex:1">📷 Foto<input type="file" accept="image/*" capture="environment" class="hidden" onchange="onPhoto(event)"></label>
        <label class="btn g sm" style="flex:1">🎬 Video<input type="file" accept="video/*" capture="environment" class="hidden" onchange="onVideo(event)"></label>
        <button class="btn g sm" style="flex:1" id="i_audiobtn" onclick="toggleAudio()">🎤 Audio</button>
      </div>
      <div class="thumbs" id="i_thumbs"></div>
    </div>
    <div class="btnrow">
      <button class="btn ok" onclick="saveIncident()">Guardar</button>
      ${isNew ? '' : '<button class="btn bad" onclick="deleteIncident()">Eliminar</button>'}
    </div>
    <button class="btn g" style="margin-top:10px" onclick="cancelIncident()">Cancelar</button>
  </div>`;
  renderThumbs();
  render();
}
async function renderThumbs() {
  const box = $('#i_thumbs'); if (!box) return;
  const parts = [];
  for (const m of incEdit.media) {
    let src = m.url || '';
    if (!src && m.localId) { const rec = await DB.getMedia(m.localId); if (rec) src = URL.createObjectURL(rec.blob); }
    const key = m.localId || m.url;
    if (m.tipo === 'foto') parts.push(`<div class="t"><img src="${src}"><button class="x" onclick="rmMedia('${key}')">×</button></div>`);
    else if (m.tipo === 'video') parts.push(`<div class="t"><video src="${src}" muted playsinline style="width:76px;height:76px;object-fit:cover;border-radius:8px" onclick="this.paused?this.play():this.pause()"></video><button class="x" onclick="rmMedia('${key}')">×</button></div>`);
    else parts.push(`<div class="t" style="width:100%"><audio controls src="${src}" style="width:100%"></audio><button class="btn bad sm" onclick="rmMedia('${key}')">Quitar audio</button></div>`);
  }
  box.innerHTML = parts.join('');
}
function rmMedia(key) { incEdit.media = incEdit.media.filter((m) => (m.localId || m.url) !== key); if (key.length > 20 || key.startsWith('blob')) {} DB.delMedia(key).catch(() => {}); renderThumbs(); }

/* Foto: reduce a máx 1600px, abre el editor de marcas y guarda en IndexedDB */
function onPhoto(ev) {
  const file = ev.target.files[0]; if (!file) return; ev.target.value = '';
  downscale(file, 1600, (blob) => annotate(blob, async (out) => {
    const lid = uid(); await DB.putMedia(lid, cur.localId, 'foto', out); incEdit.media.push({ localId: lid, tipo: 'foto' }); renderThumbs(); toast('Foto agregada');
  }));
}
function onVideo(ev) {
  const file = ev.target.files[0]; if (!file) return; ev.target.value = '';
  if (file.size > 100 * 1024 * 1024) { toast('Video muy grande (máx 100 MB). Graba uno más corto.'); return; }
  (async () => { const lid = uid(); await DB.putMedia(lid, cur.localId, 'video', file); incEdit.media.push({ localId: lid, tipo: 'video' }); renderThumbs(); toast('Video agregado'); })();
}
function downscale(file, max, cb) {
  const img = new Image();
  img.onload = () => { const sc = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(cb, 'image/jpeg', 0.85); };
  img.src = URL.createObjectURL(file);
}
/* Editor de anotación: pluma + flecha + colores sobre la foto */
function annotate(blob, done) {
  const img = new Image();
  img.onload = () => {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:#111;z-index:70;display:flex;flex-direction:column';
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;padding:10px;background:#0B1F2A;align-items:center;flex-wrap:wrap';
    const cvs = document.createElement('canvas');
    const wrap = document.createElement('div'); wrap.style.cssText = 'flex:1;overflow:auto;display:grid;place-items:center;padding:8px'; wrap.appendChild(cvs);
    modal.append(bar, wrap); document.body.appendChild(modal);
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    cvs.width = Math.round(img.width * scale); cvs.height = Math.round(img.height * scale);
    cvs.style.maxWidth = '100%'; cvs.style.touchAction = 'none';
    const ctx = cvs.getContext('2d');
    let color = '#ee1111', tool = 'pen', strokes = [], drawing = null;
    const lw = Math.max(3, cvs.width / 160), hh = Math.max(14, cvs.width / 34);
    function drawStroke(s) {
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s.tool === 'pen') { ctx.beginPath(); s.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }
      else { const a = s.pts[0], b = s.pts[s.pts.length - 1], ang = Math.atan2(b.y - a.y, b.x - a.x); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - hh * Math.cos(ang - 0.4), b.y - hh * Math.sin(ang - 0.4)); ctx.lineTo(b.x - hh * Math.cos(ang + 0.4), b.y - hh * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill(); }
    }
    function redraw() { ctx.drawImage(img, 0, 0, cvs.width, cvs.height); strokes.forEach(drawStroke); }
    function pos(e) { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) * (cvs.width / r.width), y: (e.clientY - r.top) * (cvs.height / r.height) }; }
    cvs.addEventListener('pointerdown', (e) => { e.preventDefault(); drawing = { tool, color, pts: [pos(e)] }; });
    cvs.addEventListener('pointermove', (e) => { if (!drawing) return; e.preventDefault(); drawing.pts.push(pos(e)); redraw(); drawStroke(drawing); });
    window.addEventListener('pointerup', () => { if (drawing) { strokes.push(drawing); drawing = null; redraw(); } });
    const mk = (label, fn, bg) => { const b = document.createElement('button'); b.innerHTML = label; b.style.cssText = 'background:' + (bg || '#fff') + ';border:0;border-radius:8px;padding:9px 11px;font-weight:700;cursor:pointer;font-size:15px'; b.onclick = fn; return b; };
    const penB = mk('✏️', () => { tool = 'pen'; penB.style.outline = '3px solid #C9A24B'; arrB.style.outline = 'none'; });
    const arrB = mk('➤', () => { tool = 'arrow'; arrB.style.outline = '3px solid #C9A24B'; penB.style.outline = 'none'; });
    penB.style.outline = '3px solid #C9A24B';
    const colBox = document.createElement('div'); colBox.style.cssText = 'display:flex;gap:5px;align-items:center';
    ['#ee1111', '#111111', '#00aa00', '#0088ff', '#ffffff'].forEach((c) => { const d = document.createElement('button'); d.style.cssText = 'width:26px;height:26px;border-radius:50%;border:2px solid #fff;background:' + c + ';cursor:pointer'; d.onclick = () => { color = c; }; colBox.appendChild(d); });
    bar.append(penB, arrB, colBox, mk('↶', () => { strokes.pop(); redraw(); }), mk('🗑', () => { strokes = []; redraw(); }));
    const sp = document.createElement('span'); sp.style.marginLeft = 'auto'; bar.append(sp);
    bar.append(mk('Omitir', () => { document.body.removeChild(modal); done(blob); }), mk('Guardar ✓', () => { cvs.toBlob((b) => { document.body.removeChild(modal); done(b); }, 'image/jpeg', 0.85); }, '#C9A24B'));
    redraw();
  };
  img.src = URL.createObjectURL(blob);
}
/* Audio: MediaRecorder */
async function toggleAudio() {
  const btn = $('#i_audiobtn');
  if (mediaRec && mediaRec.state === 'recording') { mediaRec.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = []; mediaRec = new MediaRecorder(stream);
    mediaRec.ondataavailable = (e) => chunks.push(e.data);
    mediaRec.onstop = async () => { stream.getTracks().forEach((t) => t.stop()); const blob = new Blob(chunks, { type: 'audio/webm' }); const lid = uid(); await DB.putMedia(lid, cur.localId, 'audio', blob); incEdit.media.push({ localId: lid, tipo: 'audio' }); btn.innerHTML = '🎤 Audio'; btn.classList.remove('bad'); renderThumbs(); toast('Audio agregado'); };
    mediaRec.start(); btn.innerHTML = '<span class="rec"></span> Detener'; btn.classList.add('bad');
  } catch (e) { toast('No se pudo acceder al micrófono'); }
}
/* Dictado por voz (donde el navegador lo soporte) */
function dictate(targetId) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Tu navegador no soporta dictado; escribe el texto.'); return; }
  const r = new SR(); r.lang = 'es-MX'; r.interimResults = false;
  r.onresult = (e) => { const t = e.results[0][0].transcript; const el = $('#' + targetId); el.value = (el.value ? el.value + ' ' : '') + t; };
  r.onerror = () => toast('No se captó la voz');
  toast('Habla ahora…'); r.start();
}

async function saveIncident() {
  incEdit.ubicacion = $('#i_ubic').value; incEdit.causa = $('#i_causa').value; incEdit.criticidad = $('#i_crit').value;
  incEdit.descripcion = $('#i_desc').value; incEdit.solucion = $('#i_sol').value; incEdit.costo = $('#i_costo').value; incEdit.estado = $('#i_estado').value;
  const idx = cur.incidents.findIndex((x) => x.id === incEdit.id);
  if (idx >= 0) cur.incidents[idx] = incEdit; else cur.incidents.push(incEdit);
  await saveLocal(); incEdit = null; toast('Incidencia guardada'); viewWizard();
}
async function deleteIncident() { if (!confirm('¿Eliminar esta incidencia?')) return; cur.incidents = cur.incidents.filter((x) => x.id !== incEdit.id); await saveLocal(); incEdit = null; viewWizard(); }
function cancelIncident() { incEdit = null; viewWizard(); }

/* --- Revisión / borrador --- */
function pendientes() { return cur.stages.reduce((a, s) => a + s.items.filter((it) => it.ok === null).length, 0); }
function viewReview() {
  const m = metrics(cur);
  const totalItems = cur.stages.reduce((a, s) => a + s.items.length, 0);
  const pend = pendientes();
  const conc = cur.concepto || 'aprobado';
  const co = (k) => `<label class="crow"><input type="radio" name="rconc" value="${k}" ${conc === k ? 'checked' : ''} onchange="onConcepto()"> ${esc(CONCEPTOS[k])}</label>`;
  app.innerHTML = topbar('', 'saveReviewFields();viewWizard()') + `<div class="wrap">
    <h1>Revisión del reporte</h1>
    <div class="muted">${esc(cur.header.modelo)} · ${esc(cur.folio || 'Borrador')}</div>
    ${pend > 0 ? `<div class="warn">⚠ Faltan <b>${pend}</b> de ${totalItems} puntos por revisar. <button class="btn gold sm" style="margin-top:8px" onclick="goPending()">Ir a pendientes →</button></div>` : `<div class="okbanner">✔ Los ${totalItems} puntos fueron revisados.</div>`}
    <div class="kpis" style="margin-top:12px">
      <div class="kpi"><div class="v">${m.aprobacion}%</div><div class="l">Aprobación</div></div>
      <div class="kpi"><div class="v">${m.incidencias}</div><div class="l">Incidencias</div></div>
      <div class="kpi"><div class="v" style="color:var(--bad)">${m.criticas}</div><div class="l">Críticas</div></div>
      <div class="kpi"><div class="v">${money(m.costoTotal)}</div><div class="l">Costo total</div></div>
    </div>
    <div class="card" style="margin-top:12px;font-size:14px">
      <div class="row"><span>🔧 ${m.nRep} fallas a reparar</span><span class="sp"></span><b>${money(m.cRep)}</b></div>
      <div class="row" style="margin-top:6px"><span>📦 ${m.nFal} faltantes de obra</span><span class="sp"></span><b>${money(m.cFal)}</b></div>
    </div>
    <h2>Incidencias (${cur.incidents.length})</h2>
    ${cur.incidents.map(incCard).join('') || '<p class="muted">Sin incidencias. ✅</p>'}
    <div class="card">
      <h2 style="margin-top:0">Concepto final</h2>
      ${co('aprobado')}${co('observaciones')}${co('rechazado')}
      <div id="plazoWrap" style="${conc === 'observaciones' ? '' : 'display:none'}"><label>Plazo para corregir (días)</label><input id="r_plazo" type="number" inputmode="numeric" value="${esc(cur.plazoDias || '')}" placeholder="Ej. 15"></div>
      <label>Observaciones adicionales</label><textarea id="r_obs" placeholder="Notas generales de la entrega…">${esc(cur.observaciones || '')}</textarea>
    </div>
    <div class="card">
      <h2 style="margin-top:0">Firma del inspector</h2>
      ${cur.firmaInspector ? `<img src="${cur.firmaInspector}" style="max-width:240px;border-bottom:2px solid var(--ink)"><div><button class="btn g sm" style="margin-top:8px" onclick="clearInspectorSign()">Volver a firmar</button></div>` : `<canvas id="isig" class="sigpad"></canvas><div class="btnrow"><button class="btn g sm" onclick="clearPadA()">Borrar</button><button class="btn ok sm" onclick="saveInspectorSign()">Guardar firma</button></div>`}
      <p class="muted" style="font-size:13px">${esc(cur.header.inspector || '')}</p>
    </div>
    ${cur.publicUrl ? `<div class="card"><b>Reporte publicado:</b><div class="link" style="margin-top:6px">${esc(location.origin + cur.publicUrl)}</div>
      <div class="btnrow" style="margin-top:8px"><button class="btn g sm" onclick="copyLink()">Copiar enlace</button><a class="btn gold sm" href="${esc(cur.publicUrl)}" target="_blank">Ver reporte</a></div></div>` : ''}
  </div>
  <div class="actionbar">
    <button class="btn g" onclick="saveReviewFields();viewWizard()">Seguir editando</button>
    <button class="btn p" id="pubbtn" onclick="publish()">${cur.publicUrl ? 'Actualizar publicación' : 'Publicar reporte'}</button>
  </div>`;
  render(); initInspectorPad();
}
function onConcepto() { const v = (document.querySelector('input[name=rconc]:checked') || {}).value; const w = document.getElementById('plazoWrap'); if (w) w.style.display = v === 'observaciones' ? '' : 'none'; }
function goPending() { saveReviewFields(); for (let i = 0; i < cur.stages.length; i++) { if (cur.stages[i].items.some((it) => it.ok === null)) { step = i; break; } } viewWizard(); }
async function saveReviewFields() { const c = document.querySelector('input[name=rconc]:checked'); if (c) cur.concepto = c.value; const pz = document.getElementById('r_plazo'); if (pz) cur.plazoDias = pz.value; const ob = document.getElementById('r_obs'); if (ob) cur.observaciones = ob.value; await saveLocal(); }
let _isig = { ctx: null, has: false, pad: null };
function initInspectorPad() {
  const pad = document.getElementById('isig'); if (!pad) return;
  pad.width = (pad.offsetWidth || 300) * 2; pad.height = 280; const ctx = pad.getContext('2d'); ctx.scale(2, 2); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B1F2A';
  _isig = { ctx, has: false, pad }; let drawing = false;
  const pp = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); drawing = true; _isig.has = true; const p = pp(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  pad.addEventListener('pointermove', (e) => { if (!drawing) return; e.preventDefault(); const p = pp(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
  window.addEventListener('pointerup', () => { drawing = false; });
}
function clearPadA() { if (_isig.ctx) { _isig.ctx.clearRect(0, 0, _isig.pad.width, _isig.pad.height); _isig.has = false; } }
async function saveInspectorSign() { if (!_isig.has) { toast('Firma dentro del recuadro'); return; } await saveReviewFields(); cur.firmaInspector = _isig.pad.toDataURL('image/png'); await saveLocal(); toast('Firma del inspector guardada'); viewReview(); }
async function clearInspectorSign() { cur.firmaInspector = null; await saveLocal(); viewReview(); }
function copyLink() { navigator.clipboard.writeText(location.origin + cur.publicUrl).then(() => toast('Enlace copiado')); }

/* --- Publicar: sincroniza con el servidor --- */
async function publish() {
  await saveReviewFields();
  const pend = pendientes();
  if (pend > 0 && !confirm('Faltan ' + pend + ' puntos por revisar. ¿Publicar de todos modos?')) return;
  if (!online()) { toast('Necesitas conexión para publicar. El borrador está guardado.'); return; }
  const btn = $('#pubbtn'); btn.textContent = 'Publicando…'; btn.disabled = true;
  try {
    // 1) crea/actualiza la inspección (obtiene id de servidor)
    let payload = Object.assign({}, cur, { status: 'borrador' });
    let r = await api('/inspections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    let j = await r.json(); cur.id = j.id; cur.folio = j.folio;
    // 2) sube medios pendientes (los que aún no tienen url)
    for (const inc of cur.incidents) {
      for (const md of (inc.media || [])) {
        if (!md.url && md.localId) {
          const rec = await DB.getMedia(md.localId);
          if (rec) {
            const fd = new FormData(); const ext = md.tipo === 'audio' ? 'webm' : 'jpg';
            fd.append('file', rec.blob, md.localId + '.' + ext);
            const ur = await api('/inspections/' + cur.id + '/media', { method: 'POST', body: fd });
            const uj = await ur.json(); if (uj.url) md.url = uj.url;
          }
        }
      }
    }
    // 3) publica con medios ya con URL
    payload = Object.assign({}, cur, { status: 'publicado' });
    r = await api('/inspections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    j = await r.json();
    cur.status = 'publicado'; cur.publicUrl = '/r/' + cur.id; cur.dirty = false;
    await DB.put('inspections', cur);
    toast('¡Reporte publicado!'); viewReview();
  } catch (e) { toast('Error al publicar: ' + e.message); btn.disabled = false; btn.textContent = 'Publicar reporte'; }
}

/* ---------- arranque ---------- */
window.addEventListener('online', () => { const t = $('.top .off'); if (t) viewDashboard(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
// exponer handlers usados en onclick
Object.assign(window, { doLogin, logout, viewDashboard, viewNew, createInspection, openInspection, gotoStep, mark, addIncident, editIncident, saveIncident, deleteIncident, cancelIncident, onPhoto, onVideo, toggleAudio, dictate, rmMedia, viewReview, viewWizard, publish, copyLink, onConcepto, goPending, saveReviewFields, saveInspectorSign, clearInspectorSign, clearPadA, capturaGPS });
TOKEN ? viewDashboard() : viewLogin();
