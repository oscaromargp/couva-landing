// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// URL pública del sitio (OG tags, canonical, sitemap). SIN slash final.
// - GitHub Pages: https://oscaromargp.github.io  + base '/couva-landing'
// - Netlify/Cloudflare (dominio raíz): tu subdominio + base '/'
const SITE = process.env.PUBLIC_SITE_URL || 'https://oscaromargp.github.io';
// Subruta de despliegue. GitHub Pages de proyecto sirve bajo /<repo>.
const BASE = process.env.PUBLIC_BASE_PATH || '/couva-landing';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  integrations: [tailwind({ applyBaseStyles: false })],
});
