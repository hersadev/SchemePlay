/**
 * Instantáneas: la red de seguridad de la importación.
 *
 * Antes de fusionar se guarda la base local entera. Así «deshacer importación»
 * es un botón y no una reconstrucción a mano. Se conservan las 10 últimas.
 */
import type { Table } from 'dexie'
import { db } from './db'
import { exportarTodo, analizar, serializar } from './fichero'
import { nuevoId } from './ids'
import type { Bloque, Esquema, Instantanea, Nodo, NombreTabla, Tema } from './tipos'
import { TABLAS } from './tipos'

const MAXIMO = 10

export async function tomarInstantanea(motivo: string): Promise<string> {
  const id = nuevoId()
  const base = await exportarTodo()

  await db.instantaneas.put({
    id,
    tomadaEn: Date.now(),
    motivo,
    contenido: serializar(base),
  })

  const sobrantes = await db.instantaneas.orderBy('tomadaEn').reverse().offset(MAXIMO).toArray()
  if (sobrantes.length) await db.instantaneas.bulkDelete(sobrantes.map((s) => s.id))

  return id
}

export async function listarInstantaneas(): Promise<Instantanea[]> {
  return db.instantaneas.orderBy('tomadaEn').reverse().toArray()
}

type FilaCualquiera = Bloque | Tema | Esquema | Nodo

function tablaDe(tabla: NombreTabla): Table<FilaCualquiera, string> {
  return db[tabla] as unknown as Table<FilaCualquiera, string>
}

/**
 * Vuelve a dejar la base como estaba, pero como una EDICIÓN más, no vaciando
 * las tablas y reponiendo la copia:
 *
 * - Las filas que cambiaron se reescriben con su contenido de entonces y la
 *   version por encima de la viva. Con la version vieja, el siguiente
 *   trasvase haría ganar al otro dispositivo y lo deshecho volvería a entrar.
 * - Lo que no existía entonces se da de baja con tombstone, no con DELETE,
 *   para que la baja también viaje.
 *
 * Lo que se editó después de la instantánea se deshace igualmente: no hay
 * forma de separarlo de lo importado. Por eso antes se toma otra instantánea,
 * y la restauración misma se puede deshacer.
 */
export async function restaurarInstantanea(id: string): Promise<void> {
  const instantanea = await db.instantaneas.get(id)
  if (!instantanea) throw new Error('Esa instantánea ya no existe.')

  // Se lee ANTES de tomar la nueva: si esta era la más antigua, la poda de
  // `tomarInstantanea` se la llevaría por delante.
  const base = analizar(instantanea.contenido)
  await tomarInstantanea(`antes de restaurar la del ${new Date(instantanea.tomadaEn).toLocaleString('es-ES')}`)

  const ahora = Date.now()

  await db.transaction('rw', [db.bloques, db.temas, db.esquemas, db.nodos], async () => {
    for (const tabla of TABLAS) {
      const vivas = new Map((await tablaDe(tabla).toArray()).map((f) => [f.id, f]))
      const deEntonces = base.filas[tabla] as FilaCualquiera[]
      const aEscribir: FilaCualquiera[] = []

      for (const fila of deEntonces) {
        const viva = vivas.get(fila.id)
        vivas.delete(fila.id)
        if (viva && viva.version === fila.version && viva.actualizadoEn === fila.actualizadoEn) {
          continue
        }
        aEscribir.push({
          ...fila,
          version: Math.max(fila.version, viva?.version ?? 0) + 1,
          actualizadoEn: ahora,
        })
      }

      // Lo que queda en `vivas` no existía cuando se tomó la instantánea.
      for (const viva of vivas.values()) {
        if (viva.borrado) continue
        aEscribir.push({ ...viva, borrado: true, version: viva.version + 1, actualizadoEn: ahora })
      }

      if (aEscribir.length) await tablaDe(tabla).bulkPut(aEscribir)
    }
  })
}
