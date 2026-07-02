// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// URL pública del sitio. Cambia esto por tu dominio/subdominio real de deploy.
// Se usa para OG tags, canonical y sitemap. Debe terminar SIN slash.
const SITE = process.env.PUBLIC_SITE_URL || 'https://couva-pardesantos.netlify.app';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  integrations: [tailwind({ applyBaseStyles: false })],
});
