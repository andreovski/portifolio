// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Trocar pelo domínio definitivo quando ele for comprado.
  site: 'https://portifolio.vercel.app',
  build: { inlineStylesheets: 'auto' },
});
