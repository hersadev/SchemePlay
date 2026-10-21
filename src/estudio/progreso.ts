/**
 * Progreso de estudio, derivado del repaso espaciado.
 *
 * El estado de un tema («en curso», «dominado») no se marca a mano: sale de
 * cuántos de sus nodos has acertado dos veces seguidas. Marcarlo a mano
 * siempre acaba mintiendo, porque nadie vuelve a tocarlo cuando deja de ser
 * verdad.
 */
import type { EstadoTema, Nodo } from '../datos/tipos'
import { estaDominado, seHaVisto } from './sm2'

export type Progreso = {
  total: number
  vistos: number
  dominados: number
  /** 0–100, redondeado. */
  porcentaje: number
}

export const PROGRESO_VACIO: Progreso = { total: 0, vistos: 0, dominados: 0, porcentaje: 0 }

/**
 * La raíz no cuenta: es el título del esquema, no algo que haya que recordar.
 * Si contara, un esquema recién creado ya tendría un nodo «pendiente».
 */
export function progresoDe(nodos: readonly Nodo[]): Progreso {
  let total = 0
  let vistos = 0
  let dominados = 0

  for (const nodo of nodos) {
    if (nodo.borrado || nodo.padreId === null) continue
    total += 1
    if (seHaVisto(nodo)) vistos += 1
    if (estaDominado(nodo)) dominados += 1
  }

  return {
    total,
    vistos,
    dominados,
    porcentaje: total === 0 ? 0 : Math.round((dominados / total) * 100),
  }
}

export function sumarProgresos(partes: readonly Progreso[]): Progreso {
  const total = partes.reduce((a, p) => a + p.total, 0)
  const vistos = partes.reduce((a, p) => a + p.vistos, 0)
  const dominados = partes.reduce((a, p) => a + p.dominados, 0)
  return {
    total,
    vistos,
    dominados,
    porcentaje: total === 0 ? 0 : Math.round((dominados / total) * 100),
  }
}

export function estadoPorProgreso(progreso: Progreso): EstadoTema {
  if (progreso.total === 0 || progreso.vistos === 0) return 'sin-empezar'
  if (progreso.porcentaje >= 90) return 'dominado'
  if (progreso.porcentaje >= 50) return 'repasando'
  return 'en-curso'
}

export const NOMBRE_ESTADO: Record<EstadoTema, string> = {
  'sin-empezar': 'Sin empezar',
  'en-curso': 'En curso',
  repasando: 'Repasando',
  dominado: 'Dominado',
}

export const COLOR_ESTADO: Record<EstadoTema, string> = {
  'sin-empezar': 'var(--tenue)',
  'en-curso': 'var(--estudio)',
  repasando: 'var(--acento)',
  dominado: 'var(--bien)',
}
