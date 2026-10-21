/**
 * La decisión de la fusión, aislada y pura.
 *
 * Vive en su propio módulo, sin tocar Dexie ni el DOM, por un motivo concreto:
 * es la única pieza del proyecto en la que un error se traduce en pérdida
 * silenciosa de trabajo, así que tiene que poder probarse sola. Ver
 * `pruebas/clasificar.prueba.ts`.
 */
import type { Fusionable } from './tipos'

export type Decision = 'insertar' | 'sobrescribir' | 'ignorar'

export type Veredicto = {
  decision: Decision
  /**
   * `version` y `actualizadoEn` no cuentan la misma historia. No impide
   * decidir, pero se le enseña al usuario antes de aplicar nada.
   */
  discrepa: boolean
}

/**
 * Decide qué hacer con una fila entrante frente a la local.
 *
 * Manda `version` —un contador que sube en cada edición local— y la fecha solo
 * desempata. Al revés sería frágil: los relojes del iPad y del PC no coinciden
 * y un reloj adelantado haría ganar a una edición más vieja.
 */
export function clasificar(local: Fusionable | undefined, entrante: Fusionable): Veredicto {
  if (!local) return { decision: 'insertar', discrepa: false }

  if (entrante.version > local.version) {
    return { decision: 'sobrescribir', discrepa: entrante.actualizadoEn < local.actualizadoEn }
  }
  if (entrante.version < local.version) {
    return { decision: 'ignorar', discrepa: entrante.actualizadoEn > local.actualizadoEn }
  }

  // Empate de version: decide la fecha, y eso ya es de por sí un conflicto.
  if (entrante.actualizadoEn > local.actualizadoEn) {
    return { decision: 'sobrescribir', discrepa: true }
  }
  if (entrante.actualizadoEn < local.actualizadoEn) {
    return { decision: 'ignorar', discrepa: true }
  }
  return { decision: 'ignorar', discrepa: false }
}
