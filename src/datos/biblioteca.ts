/**
 * CRUD de bloques, temas y esquemas.
 *
 * Todo pasa por aquí para que nadie escriba una fila sin subir `version`: si
 * una edición no sube la version, la fusión no podrá saber que es más nueva y
 * el trasvase la descartará en silencio.
 */
import { db, vivas } from './db'
import { nuevoId } from './ids'
import { ordenAlFinal, ordenInicial, porOrden } from './orden'
import type { Bloque, Esquema, EstadoTema, Nodo, Tema } from './tipos'
import { colorDeRama } from '../lienzo/estilo'

function tocar<T extends { version: number; actualizadoEn: number }>(fila: T): T {
  return { ...fila, version: fila.version + 1, actualizadoEn: Date.now() }
}

// --- lecturas ---

export async function listarBloques(): Promise<Bloque[]> {
  return porOrden(vivas(await db.bloques.toArray()))
}

export async function listarTemas(bloqueId: string): Promise<Tema[]> {
  return porOrden(vivas(await db.temas.where('bloqueId').equals(bloqueId).toArray()))
}

export async function listarEsquemas(temaId: string): Promise<Esquema[]> {
  return porOrden(vivas(await db.esquemas.where('temaId').equals(temaId).toArray()))
}

// --- bloques ---

export async function crearBloque(nombre: string): Promise<Bloque> {
  const existentes = await listarBloques()
  const bloque: Bloque = {
    id: nuevoId(),
    nombre: nombre.trim() || 'Bloque sin nombre',
    color: colorDeRama(existentes.length),
    orden: ordenAlFinal(existentes),
    version: 1,
    actualizadoEn: Date.now(),
  }
  await db.bloques.add(bloque)
  return bloque
}

export async function renombrarBloque(id: string, nombre: string): Promise<void> {
  const bloque = await db.bloques.get(id)
  if (!bloque) return
  await db.bloques.put(tocar({ ...bloque, nombre: nombre.trim() || bloque.nombre }))
}

/** Tombstone en cascada: el bloque, sus temas, sus esquemas y sus nodos. */
export async function borrarBloque(id: string): Promise<void> {
  const bloque = await db.bloques.get(id)
  if (!bloque) return

  await db.transaction('rw', [db.bloques, db.temas, db.esquemas, db.nodos], async () => {
    const temas = await db.temas.where('bloqueId').equals(id).toArray()
    for (const tema of temas) await bajaDeTema(tema)
    await db.bloques.put(tocar({ ...bloque, borrado: true }))
  })
}

// --- temas ---

export async function crearTema(
  bloqueId: string,
  nombre: string,
  numero?: string,
): Promise<Tema> {
  const existentes = await listarTemas(bloqueId)
  const tema: Tema = {
    id: nuevoId(),
    bloqueId,
    nombre: nombre.trim() || 'Tema sin nombre',
    orden: ordenAlFinal(existentes),
    estado: 'sin-empezar',
    version: 1,
    actualizadoEn: Date.now(),
    ...(numero?.trim() ? { numero: numero.trim() } : {}),
  }
  await db.temas.add(tema)
  return tema
}

export async function renombrarTema(id: string, nombre: string): Promise<void> {
  const tema = await db.temas.get(id)
  if (!tema) return
  await db.temas.put(tocar({ ...tema, nombre: nombre.trim() || tema.nombre }))
}

export async function cambiarEstadoTema(id: string, estado: EstadoTema): Promise<void> {
  const tema = await db.temas.get(id)
  if (!tema || tema.estado === estado) return
  await db.temas.put(tocar({ ...tema, estado }))
}

async function bajaDeTema(tema: Tema): Promise<void> {
  const esquemas = await db.esquemas.where('temaId').equals(tema.id).toArray()
  for (const esquema of esquemas) await bajaDeEsquema(esquema)
  await db.temas.put(tocar({ ...tema, borrado: true }))
}

export async function borrarTema(id: string): Promise<void> {
  const tema = await db.temas.get(id)
  if (!tema) return
  await db.transaction('rw', [db.temas, db.esquemas, db.nodos], () => bajaDeTema(tema))
}

// --- esquemas ---

/** Crea el esquema y su nodo raíz: un esquema sin raíz no se podría abrir. */
export async function crearEsquema(temaId: string, titulo: string): Promise<Esquema> {
  const existentes = await listarEsquemas(temaId)
  const esquemaId = nuevoId()
  const raizId = nuevoId()
  const ahora = Date.now()

  const raiz: Nodo = {
    id: raizId,
    esquemaId,
    padreId: null,
    texto: titulo.trim() || 'Tema',
    orden: ordenInicial(),
    colapsado: false,
    version: 1,
    actualizadoEn: ahora,
  }

  const esquema: Esquema = {
    id: esquemaId,
    temaId,
    titulo: titulo.trim() || 'Esquema sin título',
    nodoRaizId: raizId,
    orden: ordenAlFinal(existentes),
    version: 1,
    actualizadoEn: ahora,
  }

  await db.transaction('rw', [db.esquemas, db.nodos], async () => {
    await db.nodos.add(raiz)
    await db.esquemas.add(esquema)
  })

  return esquema
}

export async function renombrarEsquema(id: string, titulo: string): Promise<void> {
  const esquema = await db.esquemas.get(id)
  if (!esquema) return
  await db.esquemas.put(tocar({ ...esquema, titulo: titulo.trim() || esquema.titulo }))
}

async function bajaDeEsquema(esquema: Esquema): Promise<void> {
  const nodos = await db.nodos.where('esquemaId').equals(esquema.id).toArray()
  if (nodos.length) await db.nodos.bulkPut(nodos.map((n) => tocar({ ...n, borrado: true })))
  await db.esquemas.put(tocar({ ...esquema, borrado: true }))
}

export async function borrarEsquema(id: string): Promise<void> {
  const esquema = await db.esquemas.get(id)
  if (!esquema) return
  await db.transaction('rw', [db.esquemas, db.nodos], () => bajaDeEsquema(esquema))
}
