import Dexie, { type Table } from 'dexie'
import type { Ajuste, Bloque, Esquema, Instantanea, Nodo, Tema } from './tipos'

/**
 * IndexedDB va atada al ORIGEN, no a la ruta. En
 * https://hersadev.github.io/SchemePlay/ el origen es hersadev.github.io
 * entero, así que el nombre de la base es lo que separa estos datos de
 * cualquier otro proyecto publicado en esa misma cuenta.
 */
export class BaseSchemePlay extends Dexie {
  bloques!: Table<Bloque, string>
  temas!: Table<Tema, string>
  esquemas!: Table<Esquema, string>
  nodos!: Table<Nodo, string>
  instantaneas!: Table<Instantanea, string>
  ajustes!: Table<Ajuste, string>

  constructor() {
    super('schemeplay')
    this.version(1).stores({
      bloques: 'id, orden, actualizadoEn',
      temas: 'id, bloqueId, orden, estado, actualizadoEn',
      esquemas: 'id, temaId, orden, actualizadoEn',
      // El índice compuesto es el que carga los hijos de una rama al
      // desplegarla sin recorrer la tabla entera.
      nodos: 'id, esquemaId, [esquemaId+padreId], repasarEn, actualizadoEn',
      instantaneas: 'id, tomadaEn',
      ajustes: 'clave',
    })
  }
}

export const db = new BaseSchemePlay()

/**
 * Safari en iOS desaloja la IndexedDB de los sitios que considera poco usados.
 * Sin esto se puede perder trabajo local sin aviso. Devuelve si quedó
 * concedido, para poder avisar en Ajustes.
 */
export async function pedirAlmacenPersistente(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted?.()) return true
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function leerAjuste<T>(clave: string, porDefecto: T): Promise<T> {
  const fila = await db.ajustes.get(clave)
  return fila ? (fila.valor as T) : porDefecto
}

export async function escribirAjuste(clave: string, valor: unknown): Promise<void> {
  await db.ajustes.put({ clave, valor })
}

/** Filas vivas: las que no son tombstone. */
export function vivas<T extends { borrado?: boolean }>(filas: readonly T[]): T[] {
  return filas.filter((f) => !f.borrado)
}
