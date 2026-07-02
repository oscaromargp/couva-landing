import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const origin = site?.toString().replace(/\/$/, '') ?? '';
  const u = (p: string) => `${origin}${base}${p}`;

  const pages = [
    { loc: u('/es'), pr: '1.0' },
    { loc: u('/en'), pr: '0.9' },
    { loc: u('/es/aviso-de-privacidad'), pr: '0.3' },
    { loc: u('/es/terminos'), pr: '0.3' },
    { loc: u('/es/terminos-referidos'), pr: '0.3' },
    { loc: u('/en/privacy'), pr: '0.3' },
    { loc: u('/en/terms'), pr: '0.3' },
    { loc: u('/en/referral-terms'), pr: '0.3' },
  ];

  const urls = pages
    .map(
      (p) => `  <url>\n    <loc>${p.loc}</loc>\n    <xhtml:link rel="alternate" hreflang="es" href="${u('/es')}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${u('/en')}"/>\n    <priority>${p.pr}</priority>\n  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
