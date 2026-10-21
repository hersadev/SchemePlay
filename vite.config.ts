import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Se sirve desde https://hersadev.github.io/SchemePlay/, así que todo cuelga de
// esa ruta. Ojo: IndexedDB va atada al ORIGEN, no a la ruta, de modo que los
// datos viven en hersadev.github.io; el nombre de la base («schemeplay») es lo
// que evita choques con cualquier otro proyecto publicado ahí.
const BASE = '/SchemePlay/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono.svg'],
      manifest: {
        name: 'SchemePlay — esquemas de oposición',
        short_name: 'SchemePlay',
        description:
          'Mapas mentales para estudiar, organizados por bloques y temas. Los datos no salen del dispositivo.',
        lang: 'es',
        dir: 'ltr',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4f6f9',
        theme_color: '#27418c',
        icons: [
          {
            src: 'icono.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icono-mascara.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Todo es estático: cachear el App Shell completo y servirlo offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
