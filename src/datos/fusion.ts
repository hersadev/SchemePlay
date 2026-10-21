/**
 * Motor de fusión: recorre el fichero entrante y aplica la decisión de
 * `clasificar` fila por fila.
 *
 * Importar NO sustituye. Si sustituyera, cada trasvase se comería lo que
 * hubieras hecho en el dispositivo destino mientras tanto.
 */
import type { Table } from 'dexie'
import { clasificar } from './clasificar'
import { db } from './db'
import type { Bloque, Esquema, FicheroTrasvase, Nodo, NombreTabla, Tema } from './tipos'
import { TABLAS } from './tipos'

export { clasificar }
export type { Decision, Veredicto } from './clasificar'

export type Recuento = { insertados: number; actualizados: number; ignorados: number }

export type Conflicto = {
  tabla: NombreTabla
  id: string
  etiqueta: string
  gana: 'entrante' | 'local'
}

export type Previsualizacion = {
  porTabla: Record<NombreTabla, Recuento>
  total: Recuento
  conflictos: Conflicto[]
  /** Filas que el fichero marca como borradas y en local aún están vivas. */
  bajas: number
}

type FilaCualquiera = Bloque | Tema | Esquema | Nodo

function etiquetaDe(tabla: NombreTabla, fila: FilaCualquiera): string {
  if (tabla === 'esquemas') return (fila as Esquema).titulo || '(sin título)'
  if (tabla === 'nodos') return (fila as Nodo).texto || '(nodo vacío)'
  return (fila as Bloque | Tema).nombre || '(sin nombre)'
}

function recuentoVacio(): Recuento {
  return { insertados: 0, actualizados: 0, ignorados: 0 }
}

/**
 * Las cuatro tablas son homogéneas en clave primaria y en `Fusionable`, que es
 * todo lo que la fusión necesita. Esto evita repetir el bucle cuatro veces.
 */
function tablaDe(tabla: NombreTabla): Table<FilaCualquiera, string> {
  return db[tabla] as unknown as Table<FilaCualquiera, string>
}

async function localesPorId(tabla: NombreTabla): Promise<Map<string, FilaCualquiera>> {
  const filas = await tablaDe(tabla).toArray()
  return new Map(filas.map((f) => [f.id, f]))
}

/** Calcula qué pasaría al importar, sin escribir nada. */
export async function previsualizar(fichero: FicheroTrasvase): Promise<Previsualizacion> {
  const porTabla = {
    bloques: recuentoVacio(),
    temas: recuentoVacio(),
    esquemas: recuentoVacio(),
    nodos: recuentoVacio(),
  } satisfies Record<NombreTabla, Recuento>

  const conflictos: Conflicto[] = []
  let bajas = 0

  for (const tabla of TABLAS) {
    const locales = await localesPorId(tabla)
    const entrantes = fichero.filas[tabla] as FilaCualquiera[]

    for (const entrante of entrantes) {
      const local = locales.get(entrante.id)
      const { decision, discrepa } = clasificar(local, entrante)

      if (decision === 'insertar') porTabla[tabla].insertados += 1
      else if (decision === 'sobrescribir') porTabla[tabla].actualizados += 1
      else porTabla[tabla].ignorados += 1

      if (discrepa) {
        conflictos.push({
          tabla,
          id: entrante.id,
          etiqueta: etiquetaDe(tabla, decision === 'ignorar' ? local! : entrante),
          gana: decision === 'ignorar' ? 'local' : 'entrante',
        })
      }

      if (decision === 'sobrescribir' && entrante.borrado && local && !local.borrado) {
        bajas += 1
      }
    }
  }

  const total = Object.values(porTabla).reduce<Recuento>(
    (acc, r) => ({
      insertados: acc.insertados + r.insertados,
      actualizados: acc.actualizados + r.actualizados,
      ignorados: acc.ignorados + r.ignorados,
    }),
    recuentoVacio(),
  )

  return { porTabla, total, conflictos, bajas }
}

/**
 * Aplica la fusión. Todo en una sola transacción: un fichero a medias no debe
 * dejar la base inconsistente.
 *
 * La instantánea previa la toma quien llama (ver `instantaneas.ts`), porque
 * guardarla dentro de esta transacción la haría parte de lo que se revierte.
 */
export async function fusionar(fichero: FicheroTrasvase): Promise<Previsualizacion> {
  const resumen = await previsualizar(fichero)

  await db.transaction('rw', [db.bloques, db.temas, db.esquemas, db.nodos], async () => {
    for (const tabla of TABLAS) {
      const locales = await localesPorId(tabla)
      const aEscribir: FilaCualquiera[] = []

      for (const entrante of fichero.filas[tabla] as FilaCualquiera[]) {
        const { decision } = clasificar(locales.get(entrante.id), entrante)
        if (decision !== 'ignorar') aEscribir.push(entrante)
      }

      if (aEscribir.length) await tablaDe(tabla).bulkPut(aEscribir)
    }
  })

  return resumen
}
