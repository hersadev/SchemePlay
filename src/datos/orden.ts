/**
 * Orden de hermanos con índices fraccionarios.
 *
 * Con enteros, insertar entre dos hermanos obliga a reescribir todos los que
 * van detrás: N filas sucias que luego hay que fusionar una a una. Con una
 * cadena fraccionaria («a0», «a0V», «a1») se toca exactamente una fila.
 */
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

export type ConOrden = { orden: string }

/** Clave para el primer elemento de una lista vacía. */
export function ordenInicial(): string {
  return generateKeyBetween(null, null)
}

/**
 * Clave estrictamente entre `anterior` y `siguiente`. `null` significa
 * «principio» o «final» de la lista.
 */
export function ordenEntre(anterior: string | null, siguiente: string | null): string {
  return generateKeyBetween(anterior, siguiente)
}

/** `cantidad` claves consecutivas entre dos extremos. */
export function ordenesEntre(
  anterior: string | null,
  siguiente: string | null,
  cantidad: number,
): string[] {
  return generateNKeysBetween(anterior, siguiente, cantidad)
}

/** Clave para añadir al final de una lista ya ordenada. */
export function ordenAlFinal(ordenados: readonly ConOrden[]): string {
  const ultimo = ordenados.at(-1)
  return generateKeyBetween(ultimo ? ultimo.orden : null, null)
}

/** Comparador de claves fraccionarias: son cadenas, se comparan como tales. */
export function compararOrden(a: ConOrden, b: ConOrden): number {
  return a.orden < b.orden ? -1 : a.orden > b.orden ? 1 : 0
}

export function porOrden<T extends ConOrden>(filas: readonly T[]): T[] {
  return [...filas].sort(compararOrden)
}
