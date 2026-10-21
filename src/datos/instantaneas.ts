/**
 * Instantáneas: la red de seguridad de la importación.
 *
 * Antes de fusionar se guarda la base local entera. Así «deshacer importación»
 * es un botón y no una reconstrucción a mano. Se conservan las 10 últimas.
 */
import { db } from './db'
import { exportarTodo, analizar, serializar } from './fichero'
import { nuevoId } from './ids'
import type { Instantanea } from './tipos'

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

/**
 * Vuelve a dejar la base como estaba. Aquí sí se sustituye en vez de fusionar,
 * y es lo correcto: la instantánea ES el estado local completo de ese momento.
 */
export async function restaurarInstantanea(id: string): Promise<void> {
  const instantanea = await db.instantaneas.get(id)
  if (!instantanea) throw new Error('Esa instantánea ya no existe.')

  const base = analizar(instantanea.contenido)

  await db.transaction('rw', [db.bloques, db.temas, db.esquemas, db.nodos], async () => {
    await Promise.all([db.bloques.clear(), db.temas.clear(), db.esquemas.clear(), db.nodos.clear()])
    await Promise.all([
      db.bloques.bulkPut(base.filas.bloques),
      db.temas.bulkPut(base.filas.temas),
      db.esquemas.bulkPut(base.filas.esquemas),
      db.nodos.bulkPut(base.filas.nodos),
    ])
  })
}
