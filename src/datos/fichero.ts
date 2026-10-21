/**
 * El fichero `.schemeplay.json`: lo único que viaja entre dispositivos.
 *
 * Drive, iCloud, AirDrop, un cable o un pendrive son intercambiables. A la
 * fusión le da igual cómo haya llegado; solo mira las filas que trae.
 */
import { db } from './db'
import { idDispositivo } from './ids'
import type { Bloque, Esquema, FicheroTrasvase, Nodo, Tema } from './tipos'

export const FORMATO_ACTUAL = 1 as const

export async function exportarTodo(): Promise<FicheroTrasvase> {
  const [bloques, temas, esquemas, nodos] = await Promise.all([
    db.bloques.toArray(),
    db.temas.toArray(),
    db.esquemas.toArray(),
    db.nodos.toArray(),
  ])

  return {
    formato: FORMATO_ACTUAL,
    exportadoEn: Date.now(),
    dispositivo: idDispositivo(),
    alcance: 'todo',
    filas: { bloques, temas, esquemas, nodos },
  }
}

/** Solo un bloque y todo lo que cuelga de él. */
export async function exportarBloque(bloqueId: string): Promise<FicheroTrasvase> {
  const bloque = await db.bloques.get(bloqueId)
  if (!bloque) throw new ErrorFichero('Ese bloque ya no existe.')

  const temas = await db.temas.where('bloqueId').equals(bloqueId).toArray()
  const esquemas = (
    await Promise.all(temas.map((t) => db.esquemas.where('temaId').equals(t.id).toArray()))
  ).flat()
  const nodos = (
    await Promise.all(esquemas.map((e) => db.nodos.where('esquemaId').equals(e.id).toArray()))
  ).flat()

  return {
    formato: FORMATO_ACTUAL,
    exportadoEn: Date.now(),
    dispositivo: idDispositivo(),
    alcance: [`bloque:${bloqueId}`],
    filas: { bloques: [bloque], temas, esquemas, nodos },
  }
}

export function serializar(fichero: FicheroTrasvase): string {
  return JSON.stringify(fichero, null, 2)
}

export function nombreFichero(fichero: FicheroTrasvase): string {
  const f = new Date(fichero.exportadoEn)
  const dia = [
    f.getFullYear(),
    String(f.getMonth() + 1).padStart(2, '0'),
    String(f.getDate()).padStart(2, '0'),
  ].join('-')
  const ambito = fichero.alcance === 'todo' ? 'todo' : 'parcial'
  return `schemeplay-${ambito}-${dia}-${fichero.dispositivo}.json`
}

/** Dispara la descarga. En iPad va a Archivos, desde donde se sube a Drive. */
export function descargar(fichero: FicheroTrasvase): void {
  const blob = new Blob([serializar(fichero)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreFichero(fichero)
  document.body.append(a)
  a.click()
  a.remove()
  // Dar margen a que el navegador inicie la descarga antes de soltar el blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export class ErrorFichero extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorFichero'
  }
}

/**
 * Valida y convierte el texto en un fichero de trasvase. Lanza `ErrorFichero`
 * con un mensaje que se le puede enseñar al usuario tal cual: se valida ANTES
 * de tocar la base, para que un JSON a medias no deje nada a medio escribir.
 */
export function analizar(texto: string): FicheroTrasvase {
  let crudo: unknown
  try {
    crudo = JSON.parse(texto)
  } catch {
    throw new ErrorFichero('El fichero no es JSON válido. ¿Se descargó entero?')
  }

  if (!esObjeto(crudo)) throw new ErrorFichero('El fichero está vacío o no tiene la forma esperada.')

  if (crudo.formato !== FORMATO_ACTUAL) {
    throw new ErrorFichero(
      `Este fichero es de formato ${String(crudo.formato)} y esta versión lee el ${FORMATO_ACTUAL}.`,
    )
  }

  if (!esObjeto(crudo.filas)) throw new ErrorFichero('Al fichero le falta el bloque «filas».')

  const filas = {
    bloques: validarFilas<Bloque>(crudo.filas.bloques, 'bloques', ['nombre', 'orden']),
    temas: validarFilas<Tema>(crudo.filas.temas, 'temas', ['bloqueId', 'nombre', 'orden']),
    esquemas: validarFilas<Esquema>(crudo.filas.esquemas, 'esquemas', ['temaId', 'nodoRaizId']),
    nodos: validarFilas<Nodo>(crudo.filas.nodos, 'nodos', ['esquemaId', 'orden']),
  }

  // Coherencia mínima: un esquema sin su nodo raíz no se podría abrir.
  const idsNodos = new Set(filas.nodos.map((n) => n.id))
  const huerfano = filas.esquemas.find((e) => !e.borrado && !idsNodos.has(e.nodoRaizId))
  if (huerfano) {
    throw new ErrorFichero(
      `El esquema «${huerfano.titulo || huerfano.id}» viene sin su nodo raíz. El fichero está incompleto.`,
    )
  }

  return {
    formato: FORMATO_ACTUAL,
    exportadoEn: numeroO(crudo.exportadoEn, Date.now()),
    dispositivo: typeof crudo.dispositivo === 'string' ? crudo.dispositivo : 'desconocido',
    alcance: crudo.alcance === 'todo' || Array.isArray(crudo.alcance) ? crudo.alcance : 'todo',
    filas,
  }
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function numeroO(v: unknown, porDefecto: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : porDefecto
}

function validarFilas<T>(crudo: unknown, tabla: string, obligatorios: string[]): T[] {
  if (crudo === undefined) return []
  if (!Array.isArray(crudo)) throw new ErrorFichero(`«${tabla}» debería ser una lista.`)

  return crudo.map((fila, i) => {
    if (!esObjeto(fila)) throw new ErrorFichero(`La fila ${i + 1} de «${tabla}» no es un objeto.`)
    if (typeof fila.id !== 'string' || !fila.id) {
      throw new ErrorFichero(`La fila ${i + 1} de «${tabla}» no tiene id.`)
    }
    for (const campo of obligatorios) {
      if (fila[campo] === undefined || fila[campo] === null) {
        throw new ErrorFichero(`A «${tabla}» (${fila.id}) le falta el campo «${campo}».`)
      }
    }
    // Sin estos dos, la fusión no podría decidir y solo podría sustituir.
    return {
      ...fila,
      version: numeroO(fila.version, 1),
      actualizadoEn: numeroO(fila.actualizadoEn, 0),
      borrado: fila.borrado === true,
    } as T
  })
}

/** Lee un fichero elegido con `<input type="file">`. */
export async function leerDeDisco(archivo: File): Promise<FicheroTrasvase> {
  if (archivo.size > 64 * 1024 * 1024) {
    throw new ErrorFichero('El fichero pasa de 64 MB. Eso no lo ha generado SchemePlay.')
  }
  return analizar(await archivo.text())
}
