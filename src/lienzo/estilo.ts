/**
 * Métrica y tipografía del lienzo, en un solo sitio.
 *
 * Esto lo consumen DOS cosas: la medición con canvas (`medir.ts`) y el render
 * de los nodos (`NodoMental.tsx`). Si las dos no usaran exactamente los mismos
 * números, el layout calcularía cajas de un tamaño y el navegador pintaría
 * otro, y el mapa saldría descuadrado. Por eso no hay nada de esto en CSS.
 */

export const FAMILIA =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'

export type EstiloNivel = {
  tamano: number
  peso: number
  altoLinea: number
  padX: number
  padY: number
  anchoMax: number
  radio: number
  /** Líneas como máximo antes de recortar con puntos suspensivos. */
  maxLineas: number
}

const RAIZ: EstiloNivel = {
  tamano: 17,
  peso: 600,
  altoLinea: 23,
  padX: 20,
  padY: 13,
  anchoMax: 260,
  radio: 14,
  maxLineas: 3,
}

const PRINCIPAL: EstiloNivel = {
  tamano: 14.5,
  peso: 600,
  altoLinea: 20,
  padX: 14,
  padY: 9,
  anchoMax: 238,
  radio: 10,
  maxLineas: 4,
}

const HOJA: EstiloNivel = {
  tamano: 13.5,
  peso: 450,
  altoLinea: 19,
  padX: 12,
  padY: 7,
  anchoMax: 216,
  radio: 8,
  maxLineas: 4,
}

export function estiloDe(profundidad: number): EstiloNivel {
  if (profundidad === 0) return RAIZ
  if (profundidad === 1) return PRINCIPAL
  return HOJA
}

/** Atajo tipográfico tal como lo quiere `CanvasRenderingContext2D.font`. */
export function fuenteCanvas(estilo: EstiloNivel): string {
  return `${estilo.peso} ${estilo.tamano}px ${FAMILIA}`
}

/** Separación horizontal entre un nodo y sus hijos. */
export const HUECO_X = 52

/** Aire vertical entre hermanos, más generoso entre ramas principales. */
export function huecoY(profundidad: number): number {
  if (profundidad === 1) return 20
  if (profundidad === 2) return 12
  return 9
}

/** Grosor de la rama en su nacimiento y en su punta, por profundidad del hijo. */
export function grosorRama(profundidadHijo: number): [number, number] {
  if (profundidadHijo <= 1) return [3.4, 1.7]
  if (profundidadHijo === 2) return [2.1, 1.2]
  return [1.35, 0.95]
}

/**
 * Colores de rama. Cada hijo directo de la raíz coge uno y sus descendientes
 * lo heredan: es lo que permite seguir una rama de un vistazo sin leerla.
 * Elegidos para aguantar sobre fondo claro y oscuro sin cambiar de identidad.
 */
export const PALETA_RAMAS: readonly string[] = [
  '#C2504B', // teja
  '#2F7D5F', // verde bosque
  '#2D5E9E', // azul
  '#B07A1E', // ámbar
  '#7A4E9C', // violeta
  '#17798C', // teal
  '#A2476F', // ciruela
  '#5B7A2A', // oliva
]

export function colorDeRama(indice: number): string {
  return PALETA_RAMAS[indice % PALETA_RAMAS.length]!
}
