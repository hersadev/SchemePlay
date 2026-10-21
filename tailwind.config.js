/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Los tokens viven en estilos/global.css para que el tema claro/oscuro se
      // resuelva por CSS y no por clases condicionales en cada componente.
      colors: {
        fondo: 'var(--fondo)',
        lamina: 'var(--lamina)',
        hundido: 'var(--hundido)',
        tinta: 'var(--tinta)',
        suave: 'var(--suave)',
        tenue: 'var(--tenue)',
        linea: 'var(--linea)',
        acento: 'var(--acento)',
        'acento-suave': 'var(--acento-suave)',
        estudio: 'var(--estudio)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        titulo: ['Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SF Mono', 'Cascadia Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
