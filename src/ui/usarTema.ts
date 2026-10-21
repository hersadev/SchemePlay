import { useCallback, useEffect, useState } from 'react'

/**
 * Tema de la interfaz.
 *
 * Tres estados y no dos: «sistema» es el que casi siempre quieres, porque
 * sigue al modo nocturno del Mac y del iPad sin tener que acordarte de
 * cambiarlo dos veces al día. Claro y oscuro son para forzarlo.
 *
 * El CSS ya está preparado para los tres: los tokens viven en `:root`, el
 * bloque `prefers-color-scheme` está protegido con `:not([data-theme='light'])`
 * y existe un `[data-theme='dark']` explícito. Aquí solo se decide qué marca
 * lleva el <html>.
 */
export type Tema = 'sistema' | 'claro' | 'oscuro'

const CLAVE = 'schemeplay.tema'
const CONSULTA = '(prefers-color-scheme: dark)'

/** Deben coincidir con --fondo en estilos/global.css. */
const FONDO = { claro: '#f4f6f9', oscuro: '#101318' } as const

export const TEMAS: ReadonlyArray<{ valor: Tema; etiqueta: string }> = [
  { valor: 'sistema', etiqueta: 'Según el sistema' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
]

function leer(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE)
    return guardado === 'claro' || guardado === 'oscuro' ? guardado : 'sistema'
  } catch {
    return 'sistema'
  }
}

function resolver(tema: Tema): 'claro' | 'oscuro' {
  if (tema !== 'sistema') return tema
  return window.matchMedia?.(CONSULTA).matches ? 'oscuro' : 'claro'
}

function aplicar(tema: Tema): void {
  const raiz = document.documentElement
  if (tema === 'sistema') raiz.removeAttribute('data-theme')
  else raiz.setAttribute('data-theme', tema === 'oscuro' ? 'dark' : 'light')

  // La barra de estado del iPad en la app instalada usa theme-color. Si no se
  // actualiza, al forzar un tema queda del color contrario y canta mucho.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
  }
  meta.content = FONDO[resolver(tema)]
}

export function usarTema() {
  const [tema, setTema] = useState<Tema>(leer)

  useEffect(() => {
    aplicar(tema)
    try {
      localStorage.setItem(CLAVE, tema)
    } catch {
      /* sin persistir, pero la sesión sigue funcionando */
    }
  }, [tema])

  // En «sistema» hay que repintar la barra de estado cuando el Mac o el iPad
  // cambian de modo solos al anochecer; el CSS ya se encarga de los colores.
  useEffect(() => {
    if (tema !== 'sistema') return
    const consulta = window.matchMedia?.(CONSULTA)
    if (!consulta) return
    const alCambiar = () => aplicar('sistema')
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [tema])

  /** Recorre sistema → claro → oscuro → sistema. */
  const siguiente = useCallback(() => {
    setTema((previo) => (previo === 'sistema' ? 'claro' : previo === 'claro' ? 'oscuro' : 'sistema'))
  }, [])

  return { tema, efectivo: resolver(tema), setTema, siguiente }
}
