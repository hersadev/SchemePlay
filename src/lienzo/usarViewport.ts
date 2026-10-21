/**
 * Pan y zoom del lienzo, con Pointer Events.
 *
 * Un solo camino para ratón, dedo y Pencil: Pointer Events unifica los tres,
 * así que no hay ramas separadas para táctil. Dos dedos hacen pinza y
 * desplazamiento a la vez, y el gesto se calcula de forma incremental respecto
 * al fotograma anterior —no respecto al inicio— porque así no acumula deriva
 * cuando un dedo se levanta y vuelve a bajar.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Limites } from './layout'

export type Vista = { tx: number; ty: number; k: number }

const K_MINIMO = 0.2
const K_MAXIMO = 2.6

function acotar(k: number): number {
  return Math.min(K_MAXIMO, Math.max(K_MINIMO, k))
}

type Punto = { x: number; y: number }

function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function medio(a: Punto, b: Punto): Punto {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function usarViewport(
  contenedor: React.RefObject<HTMLElement>,
  limites: Limites,
) {
  const [vista, setVista] = useState<Vista>({ tx: 0, ty: 0, k: 1 })
  const [arrastrando, setArrastrando] = useState(false)

  const vistaRef = useRef(vista)
  vistaRef.current = vista

  const punteros = useRef(new Map<number, Punto>())
  const pinzaPrevia = useRef<{ dist: number; centro: Punto } | null>(null)
  /** Si el gesto arrancó sobre un nodo, un dedo no desplaza: el nodo manda. */
  const sobreNodo = useRef(false)

  const rect = useCallback(() => contenedor.current?.getBoundingClientRect(), [contenedor])

  const zoomEn = useCallback((sx: number, sy: number, factor: number) => {
    setVista((v) => {
      const k = acotar(v.k * factor)
      if (k === v.k) return v
      // El punto del mundo bajo el cursor tiene que quedarse donde está.
      const mundoX = (sx - v.tx) / v.k
      const mundoY = (sy - v.ty) / v.k
      return { k, tx: sx - mundoX * k, ty: sy - mundoY * k }
    })
  }, [])

  const encajar = useCallback(() => {
    const caja = rect()
    if (!caja || caja.width === 0) return

    const ancho = limites.x2 - limites.x1
    const alto = limites.y2 - limites.y1
    if (ancho <= 0 || alto <= 0) return

    const k = acotar(Math.min(caja.width / ancho, caja.height / alto, 1.15))
    setVista({
      k,
      tx: caja.width / 2 - ((limites.x1 + limites.x2) / 2) * k,
      ty: caja.height / 2 - ((limites.y1 + limites.y2) / 2) * k,
    })
  }, [rect, limites.x1, limites.x2, limites.y1, limites.y2])

  /** Centra el mapa al 100 %, sin reescalar. */
  const centrar = useCallback(() => {
    const caja = rect()
    if (!caja) return
    setVista((v) => ({
      k: v.k,
      tx: caja.width / 2 - ((limites.x1 + limites.x2) / 2) * v.k,
      ty: caja.height / 2 - ((limites.y1 + limites.y2) / 2) * v.k,
    }))
  }, [rect, limites.x1, limites.x2, limites.y1, limites.y2])

  const escalar = useCallback(
    (factor: number) => {
      const caja = rect()
      if (!caja) return
      zoomEn(caja.width / 2, caja.height / 2, factor)
    },
    [rect, zoomEn],
  )

  // --- rueda y trackpad ---
  useEffect(() => {
    const el = contenedor.current
    if (!el) return

    const alRodar = (e: WheelEvent) => {
      const caja = el.getBoundingClientRect()
      e.preventDefault()

      // El navegador manda la pinza del trackpad como rueda con ctrl.
      if (e.ctrlKey || e.metaKey) {
        zoomEn(e.clientX - caja.left, e.clientY - caja.top, Math.exp(-e.deltaY * 0.01))
        return
      }
      setVista((v) => ({ ...v, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY }))
    }

    el.addEventListener('wheel', alRodar, { passive: false })
    return () => el.removeEventListener('wheel', alRodar)
  }, [contenedor, zoomEn])

  // --- punteros ---
  const alBajar = useCallback(
    (e: React.PointerEvent) => {
      const el = contenedor.current
      if (!el) return

      punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (punteros.current.size === 1) {
        const destino = e.target as HTMLElement | null
        sobreNodo.current = Boolean(destino?.closest?.('[data-nodo]'))
        if (!sobreNodo.current) {
          // Solo se captura cuando de verdad vamos a desplazar: capturar
          // siempre robaría el clic a los nodos.
          el.setPointerCapture(e.pointerId)
          setArrastrando(true)
        }
      }

      if (punteros.current.size === 2) {
        const [a, b] = [...punteros.current.values()] as [Punto, Punto]
        pinzaPrevia.current = { dist: distancia(a, b), centro: medio(a, b) }
        setArrastrando(false)
      }
    },
    [contenedor],
  )

  const alMover = useCallback(
    (e: React.PointerEvent) => {
      if (!punteros.current.has(e.pointerId)) return
      const el = contenedor.current
      if (!el) return

      const anterior = punteros.current.get(e.pointerId)!
      const actual = { x: e.clientX, y: e.clientY }
      punteros.current.set(e.pointerId, actual)

      if (punteros.current.size >= 2) {
        const [a, b] = [...punteros.current.values()] as [Punto, Punto]
        const dist = distancia(a, b)
        const centro = medio(a, b)
        const previa = pinzaPrevia.current

        if (previa && previa.dist > 0) {
          const caja = el.getBoundingClientRect()
          const factor = dist / previa.dist
          const dcx = centro.x - previa.centro.x
          const dcy = centro.y - previa.centro.y

          setVista((v) => {
            const k = acotar(v.k * factor)
            // Se escala en torno al centro ANTERIOR de los dedos y después se
            // desplaza por lo que ese centro se ha movido. Hacerlo al revés
            // mete un salto en cada fotograma.
            const sx = previa.centro.x - caja.left
            const sy = previa.centro.y - caja.top
            const mundoX = (sx - v.tx) / v.k
            const mundoY = (sy - v.ty) / v.k
            return { k, tx: sx - mundoX * k + dcx, ty: sy - mundoY * k + dcy }
          })
        }

        pinzaPrevia.current = { dist, centro }
        return
      }

      if (sobreNodo.current) return

      const dx = actual.x - anterior.x
      const dy = actual.y - anterior.y
      setVista((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }))
    },
    [contenedor],
  )

  const alSoltar = useCallback((e: React.PointerEvent) => {
    punteros.current.delete(e.pointerId)
    if (punteros.current.size < 2) pinzaPrevia.current = null
    if (punteros.current.size === 0) {
      setArrastrando(false)
      sobreNodo.current = false
    }
  }, [])

  const manejadores = {
    onPointerDown: alBajar,
    onPointerMove: alMover,
    onPointerUp: alSoltar,
    onPointerCancel: alSoltar,
  }

  return { vista, arrastrando, manejadores, encajar, centrar, escalar, zoomEn }
}
