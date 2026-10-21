import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { pedirAlmacenPersistente } from './datos/db'
import { sembrarSiHaceFalta } from './datos/semilla'
import './estilos/global.css'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('Falta el contenedor #raiz en index.html')

// El ejemplo y el permiso de almacenamiento se resuelven antes del primer
// render, para que la biblioteca no aparezca vacía y vuelva a poblarse sola.
//
// Va envuelto a propósito: en navegación privada de Safari la IndexedDB puede
// estar bloqueada, y sin el try la promesa rechazada dejaría la app en blanco
// en vez de arrancar sin el ejemplo.
try {
  await sembrarSiHaceFalta()
} catch (e) {
  console.warn('No se pudo preparar el almacenamiento local:', e)
}
void pedirAlmacenPersistente()

createRoot(raiz).render(
  <StrictMode>
    {/* El basename sale del `base` de Vite, que es donde cuelga GitHub Pages. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
