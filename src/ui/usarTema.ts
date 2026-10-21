import { useCallback, useEffect, useState } from 'react'

/**
 * Tema de la interfaz: claro u oscuro, nada más.
 *
 * Mientras no hayas elegido, se usa el del sistema, de modo que la primera vez
 * no abres la app en claro a medianoche. En cuanto tocas el selector, tu
 * elección queda fija y el sistema deja de mandar.
 *
 * La marca en el <html> la pone también un script en index.html, antes del
 * primer pintado: si solo la pusiera React, cada carga con el tema forzado al
 * contrario del sistema daría un parpadeo.
 */
export type Tema = 'claro' | 'oscuro'

const CLAVE = 'schemeplay.tema'
const CONSULTA = '(prefers-color-scheme: dark)'

/** Deben coincidir con --fondo en estilos/global.css. */
const FONDO: Record<Tema, string> = { claro: '#f4f6f9', oscuro: '#101318' }

export const TEMAS: ReadonlyArray<{ valor: Tema; etiqueta: string }> = [
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
]

/** `null` = aún no ha elegido, así que manda el sistema. */
function leerElegido(): Tema | null {
  try {
    const guardado = localStorage.getItem(CLAVE)
    return guardado === 'claro' || guardado === 'oscuro' ? guardado : null
  } catch {
    return null
  }
}

function delSistema(): Tema {
  return window.matchMedia?.(CONSULTA).matches ? 'oscuro' : 'claro'
}

function aplicar(tema: Tema): void {
  document.documentElement.setAttribute('data-theme', tema === 'oscuro' ? 'dark' : 'light')

  // La barra de estado del iPad en la app instalada usa theme-color. Sin esto,
  // al forzar un tema se queda del color contrario y canta mucho.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
  }
  meta.content = FONDO[tema]
}

export function usarTema() {
  const [elegido, setElegido] = useState<Tema | null>(leerElegido)
  const [sistema, setSistema] = useState<Tema>(delSistema)

  const tema: Tema = elegido ?? sistema

  useEffect(() => {
    aplicar(tema)
  }, [tema])

  // Solo mientras no haya elección propia: después, que el sistema cambie al
  // anochecer no debe pisar lo que pediste.
  useEffect(() => {
    if (elegido) return
    const consulta = window.matchMedia?.(CONSULTA)
    if (!consulta) return
    const alCambiar = () => setSistema(delSistema())
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [elegido])

  const setTema = useCallback((siguiente: Tema) => {
    setElegido(siguiente)
    try {
      localStorage.setItem(CLAVE, siguiente)
    } catch {
      /* sin persistir, pero la sesión sigue funcionando */
    }
  }, [])

  const alternar = useCallback(() => {
    setTema(tema === 'oscuro' ? 'claro' : 'oscuro')
  }, [tema, setTema])

  return { tema, setTema, alternar }
}
