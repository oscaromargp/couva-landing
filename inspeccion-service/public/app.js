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

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => '$' + (Number(n) || 0).toLocaleString('es-MX');
const online = () => navigator.onLine;

const CAUSAS = { fabrica: 'Origen en Fábrica', transporte: 'Vibración / Transporte', montaje: 'Maniobra de Montaje / Izaje', faltante: 'Incompletitud / Omisión de Obra' };
const CRIT = { baja: 'Baja · Estético', media: 'Media · Ajuste', critica: 'Crítica · Bloqueante' };
const STAGES = [
  { id: 'e1', nombre: '1. Cimentación, apoyos y nivelación', items: ['Nivelación láser (plomo y asentamiento)', 'Apoyos / pilotes firmes y completos', 'Sin asentamientos diferenciales'] },
  { id: 'e2', nombre: '2. Estructura, pernos y soldaduras', items: ['Pernos de unión torqueados', 'Soldaduras sin fisuras ni daños por izaje', 'Estructura sin torsión ni deformación'] },
  { id: 'e3', nombre: '3. Envolvente, cubierta y sellado', items: ['Cubierta pluvial sin filtraciones', 'Sellado de juntas hermético', 'Fachada y paneles sin daños'] },
  { id: 'e4', nombre: '4. Servicios MEPH (agua, drenaje, eléctrico, gas)', items: ['Agua: presión correcta y sin fugas', 'Drenaje: cespol / tubería conectada al registro', 'Electricidad: circuitos y protecciones', 'Gas: conexión y prueba de hermeticidad'] },
  { id: 'e5', nombre: '5. Interiores, cancelería, muebles y cristales', items: ['Muros y plafones sin daños', 'Cancelería y cristales completos', 'Muebles (cocina / baño) instalados y funcionales', 'Pintura y acabados'] },
  { id: 'e6', nombre: '6. Prueba dinámica de estrés', items: ['Presión de agua + carga eléctrica simultánea', 'Sin fallas bajo carga combinada'] },
];

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
  const today = new Date().toISOString().slice(0, 10);
  app.innerHTML = topbar('', 'viewDashboard()') + `<div class="wrap">
    <h1>Datos de la casa</h1>
    <div class="card">
      <label>Modelo</label><input id="h_modelo" value="COUVA 6×6">
      <label>N° de Lote / Serie</label><input id="h_serie" placeholder="Ej. C6-2026-014">
      <label>Ubicación</label><input id="h_ubicacion" placeholder="Ej. Puerto Escondido, Oax.">
      <label>Cliente / Supervisor</label><input id="h_cliente" placeholder="Nombre de quien recibe">
      <label>Inspector</label><input id="h_inspector" value="Oscar Omar Gómez">
      <label>Fecha</label><input id="h_fecha" type="date" value="${today}">
    </div>
    <button class="btn p" onclick="createInspection()">Comenzar recorrido guiado →</button>
  </div>`;
  render();
}
async function createInspection() {
  const header = { modelo: $('#h_modelo').value, serie: $('#h_serie').value, ubicacion: $('#h_ubicacion').value, cliente: $('#h_cliente').value, inspector: $('#h_inspector').value, fecha: $('#h_fecha').value };
  if (!header.modelo) { toast('Indica el modelo'); return; }
  cur = newInspection(header); step = 0; await saveLocal(); viewWizard();
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
      <span class="sp"></span>${i.costo ? `<b>${money(i.costo)}</b>` : ''}</div>
    <div style="margin-top:6px;font-weight:600">📍 ${esc(i.ubicacion || 'Sin ubicación')}</div>
    <div class="muted" style="font-size:14px">${esc((i.descripcion || '').slice(0, 90))}</div>
    <div class="muted" style="font-size:12px;margin-top:4px">${esc(CAUSAS[i.causa] || '')}${nfotos ? ` · 📷 ${nfotos}` : ''}</div>
  </div>`;
}
function addIncident(stage, ubicPrefill) {
  incEdit = { id: uid(), stage: stage || cur.stages[step].id, ubicacion: ubicPrefill || '', causa: 'fabrica', criticidad: 'media', descripcion: '', solucion: '', costo: '', media: [] };
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
      <label>Evidencia</label>
      <div class="btnrow">
        <label class="btn g sm" style="flex:1">📷 Foto<input id="i_foto" type="file" accept="image/*" capture="environment" class="hidden" onchange="onPhoto(event)"></label>
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
    if (m.tipo === 'foto') {
      let src = m.url || '';
      if (!src && m.localId) { const rec = await DB.getMedia(m.localId); if (rec) src = URL.createObjectURL(rec.blob); }
      parts.push(`<div class="t"><img src="${src}"><button class="x" onclick="rmMedia('${m.localId || m.url}')">×</button></div>`);
    } else {
      let src = m.url || ''; if (!src && m.localId) { const rec = await DB.getMedia(m.localId); if (rec) src = URL.createObjectURL(rec.blob); }
      parts.push(`<div class="t" style="width:100%"><audio controls src="${src}" style="width:100%"></audio><button class="btn bad sm" onclick="rmMedia('${m.localId || m.url}')">Quitar audio</button></div>`);
    }
  }
  box.innerHTML = parts.join('');
}
function rmMedia(key) { incEdit.media = incEdit.media.filter((m) => (m.localId || m.url) !== key); if (key.length > 20 || key.startsWith('blob')) {} DB.delMedia(key).catch(() => {}); renderThumbs(); }

/* Foto: reduce a máx 1600px y guarda como JPEG en IndexedDB */
function onPhoto(ev) {
  const file = ev.target.files[0]; if (!file) return;
  const img = new Image();
  img.onload = () => {
    const max = 1600, sc = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(async (blob) => { const lid = uid(); await DB.putMedia(lid, cur.localId, 'foto', blob); incEdit.media.push({ localId: lid, tipo: 'foto' }); renderThumbs(); toast('Foto agregada'); }, 'image/jpeg', 0.82);
  };
  img.src = URL.createObjectURL(file);
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
  incEdit.descripcion = $('#i_desc').value; incEdit.solucion = $('#i_sol').value; incEdit.costo = $('#i_costo').value;
  const idx = cur.incidents.findIndex((x) => x.id === incEdit.id);
  if (idx >= 0) cur.incidents[idx] = incEdit; else cur.incidents.push(incEdit);
  await saveLocal(); incEdit = null; toast('Incidencia guardada'); viewWizard();
}
async function deleteIncident() { if (!confirm('¿Eliminar esta incidencia?')) return; cur.incidents = cur.incidents.filter((x) => x.id !== incEdit.id); await saveLocal(); incEdit = null; viewWizard(); }
function cancelIncident() { incEdit = null; viewWizard(); }

/* --- Revisión / borrador --- */
function viewReview() {
  const m = metrics(cur);
  app.innerHTML = topbar('', 'viewWizard()') + `<div class="wrap">
    <h1>Revisión del reporte</h1>
    <div class="muted">${esc(cur.header.modelo)} · ${esc(cur.folio || 'Borrador')}</div>
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
    ${cur.publicUrl ? `<div class="card"><b>Reporte publicado:</b><div class="link" style="margin-top:6px">${esc(location.origin + cur.publicUrl)}</div>
      <div class="btnrow" style="margin-top:8px"><button class="btn g sm" onclick="copyLink()">Copiar enlace</button><a class="btn gold sm" href="${esc(cur.publicUrl)}" target="_blank">Ver reporte</a></div></div>` : ''}
  </div>
  <div class="actionbar">
    <button class="btn g" onclick="viewWizard()">Seguir editando</button>
    <button class="btn p" id="pubbtn" onclick="publish()">${cur.publicUrl ? 'Actualizar publicación' : 'Publicar reporte'}</button>
  </div>`;
  render();
}
function copyLink() { navigator.clipboard.writeText(location.origin + cur.publicUrl).then(() => toast('Enlace copiado')); }

/* --- Publicar: sincroniza con el servidor --- */
async function publish() {
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
Object.assign(window, { doLogin, logout, viewDashboard, viewNew, createInspection, openInspection, gotoStep, mark, addIncident, editIncident, saveIncident, deleteIncident, cancelIncident, onPhoto, toggleAudio, dictate, rmMedia, viewReview, viewWizard, publish, copyLink });
TOKEN ? viewDashboard() : viewLogin();
