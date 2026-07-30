'use strict';
/* ============================================================
 * COUVA — Servicio de blog (SSR + editor tipo Shopify)
 * - Público:  /blog  y  /blog/<slug>   (HTML del servidor, SEO/OG/JSON-LD)
 * - Editor:   /blog/admin              (login + editor de una sola pantalla)
 * - API:      /blog/api/*              (auth por token; mismo user/hash del panel)
 * - Imágenes: /blog/uploads/*          (guardadas en el VPS, carpeta del proyecto)
 * Almacenamiento: un JSON por post + archivos de imagen. Sin base de datos.
 * ============================================================ */
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const SITE = (process.env.SITE_URL || 'https://couva.148-72-153-91.sslip.io').replace(/\/$/, '');
const BRAND = process.env.BRAND || 'COUVA · PardeSantos';
const ADMIN_USER = process.env.ADMIN_USER || 'oscaromargp';
const ADMIN_HASH = (process.env.ADMIN_HASH || '').toLowerCase(); // sha256(hex) de la contraseña
const SECRET = process.env.BLOG_SECRET || 'cambia-esto';
const DATA_DIR = process.env.DATA_DIR || '/data';
const POSTS_DIR = path.join(DATA_DIR, 'posts');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
for (const d of [POSTS_DIR, UPLOADS_DIR]) fs.mkdirSync(d, { recursive: true });

const app = express();
app.use(express.json({ limit: '2mb' }));

/* ---------- helpers ---------- */
const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const token = () => crypto.createHmac('sha256', SECRET).update(ADMIN_USER + ':blog').digest('hex');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
const RESERVED = new Set(['admin', 'api', 'uploads', 'rss.xml', 'sitemap.xml', '']);

// Saneado básico del HTML del editor (admin de confianza; quitamos vectores obvios).
function sanitize(html) {
  return String(html || '')
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}
function readPost(slug) {
  try { return JSON.parse(fs.readFileSync(path.join(POSTS_DIR, slug + '.json'), 'utf8')); } catch { return null; }
}
function allPosts() {
  return fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.json'))
    .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8')); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => String(b.publishedAt || b.createdAt || '').localeCompare(String(a.publishedAt || a.createdAt || '')));
}
function auth(req, res, next) {
  const t = req.get('x-blog-token') || '';
  if (t && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(token()))) return next();
  return res.status(401).json({ error: 'auth' });
}
const abs = (u) => (!u ? '' : /^https?:\/\//.test(u) ? u : SITE + u);
function fmtDate(iso, opts) {
  try { return new Date(iso).toLocaleDateString('es-MX', opts || { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return ''; }
}

/* ---------- estilos compartidos (público) ---------- */
const CSS = `
:root{--cream:#FAF7F0;--ink:#0B1F2A;--sea:#0F5E6E;--gold:#C9A24B;--sand:#EFE7D6;--line:rgba(11,31,42,.12)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--ink);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.65}
a{color:var(--sea);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:820px;margin:0 auto;padding:0 20px}
.wide{max-width:1120px}
h1,h2,h3{font-family:Fraunces,Georgia,serif;line-height:1.15;font-weight:700}
.top{border-bottom:1px solid var(--line);background:rgba(255,255,255,.8);backdrop-filter:blur(6px);position:sticky;top:0;z-index:5}
.top .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.brand{font-family:Fraunces,serif;font-weight:700;font-size:20px;color:var(--ink)}
.brand b{color:var(--gold)}
.muted{color:rgba(11,31,42,.6)}
.chip{display:inline-block;font-size:12px;font-weight:600;color:var(--sea);background:rgba(15,94,110,.1);padding:2px 10px;border-radius:999px}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:.15s;display:block}
.card:hover{transform:translateY(-2px);box-shadow:0 12px 30px -18px rgba(11,31,42,.4);text-decoration:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px}
.cover{aspect-ratio:16/9;object-fit:cover;width:100%;background:var(--sand)}
.pad{padding:18px}
.post img{max-width:100%;height:auto;border-radius:12px}
.post h2{margin-top:1.8em}.post h3{margin-top:1.4em}
.post blockquote{border-left:4px solid var(--gold);margin:1.2em 0;padding:.2em 1.1em;color:rgba(11,31,42,.75);font-style:italic}
.hero-cover{width:100%;max-height:460px;object-fit:cover;border-radius:18px;margin:8px 0 4px}
.foot{border-top:1px solid var(--line);margin-top:60px;padding:30px 0;text-align:center}
.btn{display:inline-block;background:var(--ink);color:var(--cream);padding:10px 18px;border-radius:999px;font-weight:600}
.btn:hover{text-decoration:none;opacity:.92}
`;

function layout({ title, desc, canonical, image, type, jsonld, body }) {
  const t = esc(title || BRAND);
  const d = esc(desc || '');
  const img = abs(image || SITE + '/og/og-es.jpg');
  return `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:type" content="${type || 'website'}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${esc(img)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="alternate" type="application/rss+xml" title="${esc(BRAND)} — Noticias" href="${SITE}/blog/rss.xml">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head><body>
<header class="top"><div class="wrap wide">
  <a class="brand" href="${SITE}/es/">COU<b>VA</b> · Noticias</a>
  <a class="muted" href="${SITE}/es/">← Volver al sitio</a>
</div></header>
${body}
<footer class="foot"><div class="wrap"><div class="muted">© ${new Date().getFullYear()} PardeSantos · COUVA 6×6 — <a href="${SITE}/es/">couva</a></div></div></footer>
</body></html>`;
}

/* ---------- público: índice ---------- */
app.get('/blog', (req, res) => {
  const posts = allPosts().filter((p) => p.visible);
  const cards = posts.map((p) => `
    <a class="card" href="${SITE}/blog/${esc(p.slug)}">
      ${p.coverUrl ? `<img class="cover" src="${esc(abs(p.coverUrl))}" alt="${esc(p.title)}" loading="lazy">` : ''}
      <div class="pad">
        ${p.category ? `<span class="chip">${esc(p.category)}</span>` : ''}
        <h3 style="margin:.5em 0 .3em">${esc(p.title)}</h3>
        <p class="muted" style="margin:0">${esc(p.excerptText || '')}</p>
        <p class="muted" style="font-size:13px;margin:.8em 0 0">${esc(fmtDate(p.publishedAt || p.createdAt))}</p>
      </div>
    </a>`).join('');
  const body = `<main class="wrap wide" style="padding:44px 20px 20px">
    <span class="chip">Noticias</span>
    <h1 style="font-size:clamp(30px,5vw,44px);margin:.3em 0 .1em">Novedades de COUVA</h1>
    <p class="muted" style="max-width:640px">Historias, avances de obra, lanzamientos y guías para tu casa modular COUVA 6×6.</p>
    <div class="grid" style="margin-top:34px">${cards || '<p class="muted">Aún no hay publicaciones. Pronto habrá novedades. 🏡</p>'}</div>
  </main>`;
  res.set('Cache-Control', 'public, max-age=120');
  res.send(layout({ title: `Noticias — ${BRAND}`, desc: 'Novedades, avances y guías de la casa modular COUVA 6×6.', canonical: `${SITE}/blog`, body }));
});

/* ---------- RSS + sitemap ---------- */
app.get('/blog/rss.xml', (req, res) => {
  const items = allPosts().filter((p) => p.visible).slice(0, 30).map((p) => `
  <item><title>${esc(p.title)}</title><link>${SITE}/blog/${esc(p.slug)}</link>
  <guid>${SITE}/blog/${esc(p.slug)}</guid><pubDate>${new Date(p.publishedAt || p.createdAt).toUTCString()}</pubDate>
  <description>${esc(p.excerptText || p.metaDescription || '')}</description></item>`).join('');
  res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
  <title>${esc(BRAND)} — Noticias</title><link>${SITE}/blog</link>
  <description>Novedades de COUVA 6×6</description><language>es</language>${items}</channel></rss>`);
});
app.get('/blog/sitemap.xml', (req, res) => {
  const urls = allPosts().filter((p) => p.visible).map((p) =>
    `<url><loc>${SITE}/blog/${esc(p.slug)}</loc><lastmod>${new Date(p.updatedAt || p.createdAt).toISOString()}</lastmod></url>`).join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/blog</loc></url>${urls}</urlset>`);
});

/* ---------- imágenes (estáticas) + subida ---------- */
app.use('/blog/uploads', express.static(UPLOADS_DIR, { maxAge: '30d', immutable: true }));
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '');
      cb(null, Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex') + ext);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});
app.post('/blog/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  res.json({ url: '/blog/uploads/' + req.file.filename });
});

/* ---------- API editor ---------- */
app.post('/blog/api/login', (req, res) => {
  const { user, password } = req.body || {};
  if (user === ADMIN_USER && ADMIN_HASH && sha256(password) === ADMIN_HASH) return res.json({ token: token() });
  res.status(401).json({ error: 'bad_credentials' });
});
app.get('/blog/api/posts', auth, (req, res) => res.json(allPosts()));
app.get('/blog/api/posts/:slug', auth, (req, res) => {
  const p = readPost(req.params.slug);
  return p ? res.json(p) : res.status(404).json({ error: 'not_found' });
});
app.post('/blog/api/posts', auth, (req, res) => {
  const b = req.body || {};
  let slug = slugify(b.slug || b.title);
  if (!slug || RESERVED.has(slug)) return res.status(400).json({ error: 'slug' });
  if (!b.title) return res.status(400).json({ error: 'title' });
  const prev = readPost(b.origSlug || slug);
  const now = new Date().toISOString();
  const contentHtml = sanitize(b.contentHtml);
  const excerptHtml = sanitize(b.excerptHtml);
  const excerptText = excerptHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
  const visible = !!b.visible;
  const post = {
    slug, title: String(b.title).slice(0, 200),
    contentHtml, excerptHtml, excerptText,
    coverUrl: b.coverUrl || '', author: String(b.author || 'PardeSantos').slice(0, 80),
    category: String(b.category || 'Noticias').slice(0, 60),
    tags: Array.isArray(b.tags) ? b.tags.slice(0, 12) : String(b.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12),
    seoTitle: String(b.seoTitle || '').slice(0, 70), metaDescription: String(b.metaDescription || '').slice(0, 160),
    visible,
    createdAt: prev ? prev.createdAt : now,
    publishedAt: visible ? (prev && prev.publishedAt ? prev.publishedAt : now) : (prev ? prev.publishedAt || '' : ''),
    updatedAt: now,
  };
  // si cambió el slug, elimina el archivo anterior
  if (b.origSlug && b.origSlug !== slug) { try { fs.unlinkSync(path.join(POSTS_DIR, b.origSlug + '.json')); } catch {} }
  fs.writeFileSync(path.join(POSTS_DIR, slug + '.json'), JSON.stringify(post, null, 2));
  res.json({ ok: true, slug, url: `${SITE}/blog/${slug}` });
});
app.delete('/blog/api/posts/:slug', auth, (req, res) => {
  try { fs.unlinkSync(path.join(POSTS_DIR, req.params.slug + '.json')); res.json({ ok: true }); }
  catch { res.status(404).json({ error: 'not_found' }); }
});

/* ---------- editor (Shopify-like) ---------- */
app.get('/blog/admin', (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.send(EDITOR_HTML);
});

/* ---------- público: post individual (debe ir al final) ---------- */
app.get('/blog/:slug', (req, res) => {
  const slug = req.params.slug;
  if (RESERVED.has(slug)) return res.status(404).send(layout({ title: 'No encontrado', body: '<main class="wrap" style="padding:80px 20px;text-align:center"><h1>404</h1><p class="muted">Esta página no existe.</p><a class="btn" href="' + SITE + '/blog">Ver noticias</a></main>' }));
  const p = readPost(slug);
  if (!p || !p.visible) return res.status(404).send(layout({ title: 'No encontrado', body: '<main class="wrap" style="padding:80px 20px;text-align:center"><h1>404</h1><p class="muted">Esta noticia no existe o aún no se publica.</p><a class="btn" href="' + SITE + '/blog">Ver noticias</a></main>' }));
  const canonical = `${SITE}/blog/${p.slug}`;
  const desc = p.metaDescription || p.excerptText || '';
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: p.title, description: desc,
    image: p.coverUrl ? [abs(p.coverUrl)] : [SITE + '/og/og-es.jpg'],
    datePublished: p.publishedAt || p.createdAt, dateModified: p.updatedAt,
    author: { '@type': 'Organization', name: p.author || 'PardeSantos' },
    publisher: { '@type': 'Organization', name: 'PardeSantos', logo: { '@type': 'ImageObject', url: SITE + '/favicon.svg' } },
    mainEntityOfPage: canonical,
  };
  const body = `<article class="wrap post" style="padding:40px 20px 10px">
    <a class="muted" href="${SITE}/blog">← Noticias</a>
    ${p.category ? `<div style="margin-top:14px"><span class="chip">${esc(p.category)}</span></div>` : ''}
    <h1 style="font-size:clamp(28px,5vw,46px);margin:.25em 0 .15em">${esc(p.title)}</h1>
    <p class="muted" style="margin:0 0 4px">${esc(fmtDate(p.publishedAt || p.createdAt))} · ${esc(p.author || 'PardeSantos')}</p>
    ${p.coverUrl ? `<img class="hero-cover" src="${esc(abs(p.coverUrl))}" alt="${esc(p.title)}">` : ''}
    <div style="font-size:18px">${p.contentHtml || ''}</div>
    ${Array.isArray(p.tags) && p.tags.length ? `<p style="margin-top:34px">${p.tags.map((t) => `<span class="chip" style="margin-right:6px">#${esc(t)}</span>`).join('')}</p>` : ''}
    <div style="margin:40px 0"><a class="btn" href="${SITE}/es/#contacto">Solicitar cotización →</a></div>
  </article>`;
  res.set('Cache-Control', 'public, max-age=120');
  res.send(layout({ title: (p.seoTitle || p.title) + ' — ' + BRAND, desc, canonical, image: p.coverUrl, type: 'article', jsonld, body }));
});

app.get('/blog/healthz', (req, res) => res.send('ok'));
app.listen(PORT, () => console.log('couva-blog on :' + PORT));

/* ============================================================
 * EDITOR HTML (una sola pantalla, estilo Shopify). Usa Quill (CDN).
 * ============================================================ */
const EDITOR_HTML = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Editor de blog · COUVA</title>
<link href="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#f1f2f4;--card:#fff;--ink:#1a1c1e;--mut:#6b7177;--line:#e1e3e5;--brand:#0F5E6E;--brandd:#0b4653}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;font-size:14px}
.hidden{display:none!important}
.bar{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:10px 18px}
.bar .l{display:flex;align-items:center;gap:12px}
.bar h1{font-size:15px;margin:0;font-weight:600}
.btn{border:0;border-radius:8px;padding:9px 16px;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit}
.btn.p{background:var(--brand);color:#fff}.btn.p:hover{background:var(--brandd)}
.btn.g{background:#fff;border:1px solid #c9cccf}.btn.g:hover{background:#f6f6f7}
.btn.d{background:#fff;border:1px solid #e0b3b3;color:#b0442e}
.wrap{max-width:1180px;margin:0 auto;padding:20px;display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start}
@media(max-width:900px){.wrap{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px}
.card h2{font-size:14px;margin:0 0 12px;font-weight:600}
label{display:block;font-size:13px;font-weight:500;margin:12px 0 5px}label:first-child{margin-top:0}
.hint{font-size:12px;color:var(--mut);margin:0 0 10px}
input[type=text],textarea,select{width:100%;border:1px solid #c9cccf;border-radius:8px;padding:9px 11px;font-family:inherit;font-size:14px;background:#fff}
input:focus,textarea:focus,select:focus{outline:2px solid var(--brand);outline-offset:-1px;border-color:var(--brand)}
.counter{font-size:12px;color:var(--mut);margin-top:4px}
.ql-container{min-height:180px;font-size:15px;border-bottom-left-radius:8px;border-bottom-right-radius:8px}
.ql-toolbar{border-top-left-radius:8px;border-top-right-radius:8px}
#exq .ql-container{min-height:90px}
.drop{border:2px dashed #c9cccf;border-radius:10px;padding:22px;text-align:center;color:var(--mut);cursor:pointer}
.drop:hover{border-color:var(--brand);color:var(--brand)}
.cover{width:100%;border-radius:8px;display:block}
.radio{display:flex;align-items:center;gap:8px;margin:6px 0;font-weight:500}
.serp{border:1px solid var(--line);border-radius:8px;padding:12px;background:#fafbfb;margin-top:6px}
.serp .u{color:#1a7f37;font-size:13px}.serp .t{color:#1a0dab;font-size:17px;margin:2px 0}.serp .d{color:#4d5156;font-size:13px}
.posts{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;z-index:30}
.posts .box{background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:80vh;overflow:auto}
.prow{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line)}
.prow:hover{background:#f6f6f7}
.tag{display:inline-block;font-size:11px;background:#eef0f2;border-radius:6px;padding:1px 7px;margin-left:6px}
#login{max-width:360px;margin:9vh auto;background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px}
#login h1{font-size:18px;margin:0 0 4px}#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1c1e;color:#fff;padding:10px 18px;border-radius:8px;opacity:0;transition:.2s;z-index:50}
#toast.show{opacity:1}
</style></head><body>

<div id="login">
  <h1>Editor de blog</h1><p class="hint">COUVA · Noticias</p>
  <label>Usuario</label><input id="lu" type="text" autocomplete="username" value="oscaromargp">
  <label>Contraseña</label><input id="lp" type="password" autocomplete="current-password">
  <p id="lerr" style="color:#b0442e;font-size:13px;min-height:18px;margin:8px 0 0"></p>
  <button class="btn p" style="width:100%;margin-top:10px" onclick="login()">Entrar</button>
</div>

<div id="app" class="hidden">
  <div class="bar">
    <div class="l">
      <button class="btn g" onclick="openList()">☰ Posts</button>
      <button class="btn g" onclick="newPost()">＋ Nuevo</button>
      <h1 id="crumb">Nuevo post</h1>
    </div>
    <div class="l">
      <a class="btn g" id="viewlink" href="#" target="_blank" rel="noopener">Ver</a>
      <button class="btn p" onclick="save()">Guardar</button>
    </div>
  </div>
  <div class="wrap">
    <div>
      <div class="card"><label>Título</label><input id="title" type="text" placeholder="Ej.: Entregamos la primera COUVA en Puerto Escondido"></div>
      <div class="card"><h2>Contenido</h2><div id="content"></div></div>
      <div class="card"><h2>Extracto</h2><p class="hint">Resumen que aparece en la lista del blog y en redes.</p><div id="excerpt"></div></div>
      <div class="card">
        <h2>Listado en buscadores (SEO)</h2>
        <p class="hint">Cómo se verá este post en Google.</p>
        <div class="serp"><div class="u" id="s-u"></div><div class="t" id="s-t">Título del post</div><div class="d" id="s-d">La meta descripción aparecerá aquí…</div></div>
        <label>Título de la página</label><input id="seoTitle" type="text" maxlength="70" oninput="serp()"><div class="counter"><span id="c-seo">0</span> de 70</div>
        <label>Meta descripción</label><textarea id="metaDescription" rows="3" maxlength="160" oninput="serp()"></textarea><div class="counter"><span id="c-meta">0</span> de 160</div>
        <label>URL (handle)</label><input id="slug" type="text" placeholder="se-genera-del-titulo" oninput="serp()">
      </div>
    </div>
    <div>
      <div class="card"><h2>Visibilidad</h2>
        <label class="radio"><input type="radio" name="vis" value="1"> Visible (publicado)</label>
        <label class="radio"><input type="radio" name="vis" value="0" checked> Oculto (borrador)</label>
      </div>
      <div class="card"><h2>Imagen de portada</h2>
        <div id="drop" class="drop" onclick="pick()">＋ Agregar imagen<br><span style="font-size:12px">o arrastra una aquí</span></div>
        <img id="cover" class="cover hidden" alt="portada">
        <input id="file" type="file" accept="image/*" class="hidden">
        <button id="rmcover" class="btn g hidden" style="width:100%;margin-top:8px" onclick="rmCover()">Quitar portada</button>
      </div>
      <div class="card"><h2>Organización</h2>
        <label>Autor</label><input id="author" type="text" value="PardeSantos">
        <label>Blog / Categoría</label><input id="category" type="text" value="Noticias">
        <label>Etiquetas</label><input id="tags" type="text" placeholder="obra, lanzamiento, playa"><p class="hint">Separadas por coma.</p>
      </div>
      <button class="btn d" style="width:100%" onclick="del()">Eliminar post</button>
    </div>
  </div>
</div>

<div id="list" class="posts hidden" onclick="if(event.target===this)this.classList.add('hidden')">
  <div class="box"><div class="prow" style="font-weight:600">Tus posts <button class="btn g" onclick="closeList()">✕</button></div><div id="listbody"></div></div>
</div>
<div id="toast"></div>

<script src="https://cdn.jsdelivr.net/npm/quill@2/dist/quill.min.js"></script>
<script>
var TOKEN=localStorage.getItem('couva_blog_token')||'';
var origSlug='';
var qc,qe;
function toast(m){var t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2200)}
function api(path,opts){opts=opts||{};opts.headers=Object.assign({'Content-Type':'application/json','x-blog-token':TOKEN},opts.headers||{});return fetch('/blog/api'+path,opts).then(function(r){if(r.status===401){logout();throw new Error('401')}return r})}
function toolbar(){return[['bold','italic','underline'],[{header:[2,3,false]}],[{list:'ordered'},{list:'bullet'}],['blockquote','link','image'],[{align:[]}],['clean']]}
function boot(){
  qc=new Quill('#content',{theme:'snow',modules:{toolbar:toolbar()},placeholder:'Escribe la noticia…'});
  qe=new Quill('#excerpt',{theme:'snow',modules:{toolbar:[['bold','italic'],['link']]},placeholder:'Resumen breve…'});
  document.getElementById('title').addEventListener('input',function(){if(!origSlug&&!document.getElementById('slug').value){/*auto slug preview*/}serp()});
  document.getElementById('file').addEventListener('change',function(e){if(e.target.files[0])uploadCover(e.target.files[0])});
  var d=document.getElementById('drop');
  ['dragover','dragenter'].forEach(function(ev){d.addEventListener(ev,function(e){e.preventDefault();d.style.borderColor='#0F5E6E'})});
  ['dragleave','drop'].forEach(function(ev){d.addEventListener(ev,function(e){e.preventDefault();d.style.borderColor=''})});
  d.addEventListener('drop',function(e){if(e.dataTransfer.files[0])uploadCover(e.dataTransfer.files[0])});
  if(TOKEN){show()}else{document.getElementById('login').classList.remove('hidden')}
}
function show(){document.getElementById('login').classList.add('hidden');document.getElementById('app').classList.remove('hidden')}
function logout(){localStorage.removeItem('couva_blog_token');TOKEN='';location.reload()}
function login(){
  fetch('/blog/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:document.getElementById('lu').value,password:document.getElementById('lp').value})})
  .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})}).then(function(x){
    if(x.ok&&x.j.token){TOKEN=x.j.token;localStorage.setItem('couva_blog_token',TOKEN);show();newPost()}
    else{document.getElementById('lerr').textContent='Usuario o contraseña incorrectos.'}
  }).catch(function(){document.getElementById('lerr').textContent='Error de conexión.'})
}
function val(id){return document.getElementById(id).value}
function setVal(id,v){document.getElementById(id).value=v==null?'':v}
function serp(){
  var t=val('seoTitle')||val('title')||'Título del post';
  var d=val('metaDescription')||qe&&qe.getText().trim()||'La meta descripción aparecerá aquí…';
  var s=val('slug')||slugify(val('title'));
  document.getElementById('s-t').textContent=t;
  document.getElementById('s-d').textContent=d;
  document.getElementById('s-u').textContent=location.origin+'/blog/'+(s||'…');
  document.getElementById('c-seo').textContent=val('seoTitle').length;
  document.getElementById('c-meta').textContent=val('metaDescription').length;
  document.getElementById('viewlink').href='/blog/'+(s||'');
}
function slugify(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9\\s-]/g,'').trim().replace(/\\s+/g,'-').replace(/-+/g,'-').slice(0,80)}
function pick(){document.getElementById('file').click()}
function uploadCover(f){var fd=new FormData();fd.append('file',f);toast('Subiendo imagen…');
  fetch('/blog/api/upload',{method:'POST',headers:{'x-blog-token':TOKEN},body:fd}).then(function(r){return r.json()}).then(function(j){
    if(j.url){setCover(j.url);toast('Imagen lista')}else toast('No se pudo subir')})}
function setCover(url){document.getElementById('cover').src=url;document.getElementById('cover').dataset.url=url;
  document.getElementById('cover').classList.remove('hidden');document.getElementById('rmcover').classList.remove('hidden');document.getElementById('drop').classList.add('hidden')}
function rmCover(){var c=document.getElementById('cover');c.src='';c.dataset.url='';c.classList.add('hidden');document.getElementById('rmcover').classList.add('hidden');document.getElementById('drop').classList.remove('hidden')}
function setVis(v){document.querySelectorAll('input[name=vis]').forEach(function(r){r.checked=(r.value===String(v))})}
function getVis(){return document.querySelector('input[name=vis]:checked').value==='1'}
function newPost(){origSlug='';document.getElementById('crumb').textContent='Nuevo post';
  setVal('title','');setVal('slug','');setVal('seoTitle','');setVal('metaDescription','');setVal('author','PardeSantos');setVal('category','Noticias');setVal('tags','');
  qc.setContents([]);qe.setContents([]);rmCover();setVis(0);serp()}
function load(p){origSlug=p.slug;document.getElementById('crumb').textContent=p.title;
  setVal('title',p.title);setVal('slug',p.slug);setVal('seoTitle',p.seoTitle);setVal('metaDescription',p.metaDescription);
  setVal('author',p.author);setVal('category',p.category);setVal('tags',(p.tags||[]).join(', '));
  qc.root.innerHTML=p.contentHtml||'';qe.root.innerHTML=p.excerptHtml||'';
  if(p.coverUrl)setCover(p.coverUrl);else rmCover();setVis(p.visible?1:0);serp();closeList();window.scrollTo(0,0)}
function collect(){return{origSlug:origSlug,title:val('title'),slug:val('slug'),contentHtml:qc.root.innerHTML,excerptHtml:qe.root.innerHTML,
  coverUrl:document.getElementById('cover').dataset.url||'',author:val('author'),category:val('category'),tags:val('tags'),
  seoTitle:val('seoTitle'),metaDescription:val('metaDescription'),visible:getVis()}}
function save(){var d=collect();if(!d.title){toast('Ponle un título');return}
  api('/posts',{method:'POST',body:JSON.stringify(d)}).then(function(r){return r.json()}).then(function(j){
    if(j.ok){origSlug=j.slug;setVal('slug',j.slug);serp();toast(d.visible?'Publicado ✓':'Guardado (borrador) ✓')}
    else toast('Error: '+(j.error||'?'))}).catch(function(){})}
function del(){if(!origSlug){newPost();return}if(!confirm('¿Eliminar este post?'))return;
  api('/posts/'+origSlug,{method:'DELETE'}).then(function(){toast('Eliminado');newPost()}).catch(function(){})}
function openList(){api('/posts').then(function(r){return r.json()}).then(function(list){
  document.getElementById('listbody').innerHTML=list.length?list.map(function(p){
    return '<div class="prow"><div><b>'+esc(p.title)+'</b>'+(p.visible?'<span class="tag">visible</span>':'<span class="tag">borrador</span>')+'<br><span style="font-size:12px;color:#6b7177">/blog/'+esc(p.slug)+'</span></div><button class="btn g" data-s="'+esc(p.slug)+'">Editar</button></div>'
  }).join(''):'<div class="prow">Aún no hay posts.</div>';
  document.querySelectorAll('#listbody [data-s]').forEach(function(b){b.onclick=function(){api('/posts/'+b.dataset.s).then(function(r){return r.json()}).then(load)}});
  document.getElementById('list').classList.remove('hidden')})}
function closeList(){document.getElementById('list').classList.add('hidden')}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
boot();
</script></body></html>`;
