import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// En GitHub Pages la app cuelga de /SchemePlay/; en Docker se sirve desde la
// raíz. De ahí que la ruta base sea una variable de entorno de construcción.
//
// Ojo: IndexedDB va atada al ORIGEN, no a la ruta. En hersadev.github.io los
// datos los comparte todo lo publicado en esa cuenta, y lo que los separa es
// el nombre de la base («schemeplay»). El reverso es que cambiar de dominio
// deja los datos atrás: hay que exportar antes de mudarse.
const BASE = process.env.BASE_PATH ?? '/SchemePlay/'

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
