/**
 * Contenido de ejemplo para el primer arranque, para que el lienzo no abra en
 * blanco y se vea de un golpe qué pinta tiene un esquema montado.
 */
import { db, escribirAjuste, leerAjuste } from './db'
import { nuevoId } from './ids'
import { ordenesEntre, ordenInicial } from './orden'
import type { Bloque, Esquema, Lado, Nodo, Tema } from './tipos'

type Rama = { texto: string; hijos?: Rama[] }

const AHORA = () => Date.now()

function nuevaRaiz(esquemaId: string, texto: string): Nodo {
  return {
    id: nuevoId(),
    esquemaId,
    padreId: null,
    texto,
    orden: ordenInicial(),
    colapsado: false,
    version: 1,
    actualizadoEn: AHORA(),
  }
}

function colgar(esquemaId: string, padreId: string, ramas: Rama[], lado?: Lado): Nodo[] {
  const claves = ordenesEntre(null, null, ramas.length)
  const salida: Nodo[] = []

  ramas.forEach((rama, i) => {
    const nodo: Nodo = {
      id: nuevoId(),
      esquemaId,
      padreId,
      texto: rama.texto,
      orden: claves[i]!,
      colapsado: false,
      version: 1,
      actualizadoEn: AHORA(),
      ...(lado ? { lado } : {}),
    }
    salida.push(nodo)
    if (rama.hijos?.length) salida.push(...colgar(esquemaId, nodo.id, rama.hijos))
  })

  return salida
}

type PlanEsquema = {
  titulo: string
  raiz: string
  derecha: Rama[]
  izquierda: Rama[]
}

function montarEsquema(temaId: string, orden: string, plan: PlanEsquema): {
  esquema: Esquema
  nodos: Nodo[]
} {
  const esquemaId = nuevoId()
  const raiz = nuevaRaiz(esquemaId, plan.raiz)

  // Las claves de orden se reparten por separado y luego se intercalan, para
  // que los hijos de la raíz queden alternando lado al recorrerlos.
  const nodos = [
    raiz,
    ...colgar(esquemaId, raiz.id, plan.derecha, 'der'),
    ...colgar(esquemaId, raiz.id, plan.izquierda, 'izq'),
  ]

  // Reasignar el orden de los hijos directos para que derecha e izquierda no
  // compartan claves (cada rama se creó con su propia secuencia desde cero).
  const directos = nodos.filter((n) => n.padreId === raiz.id)
  const claves = ordenesEntre(null, null, directos.length)
  directos.forEach((n, i) => {
    n.orden = claves[i]!
  })

  return {
    esquema: {
      id: esquemaId,
      temaId,
      titulo: plan.titulo,
      nodoRaizId: raiz.id,
      orden,
      version: 1,
      actualizadoEn: AHORA(),
    },
    nodos,
  }
}

const PLAN = [
  {
    bloque: 'Bloque I — Organización del Estado',
    color: '#2D5E9E',
    temas: [
      {
        numero: 'Tema 3',
        nombre: 'La Constitución de 1978',
        estado: 'en-curso' as const,
        esquema: {
          titulo: 'Estructura de la Constitución',
          raiz: 'Constitución de 1978',
          derecha: [
            {
              texto: 'Título Preliminar',
              hijos: [
                { texto: 'Art. 1 — Estado social y democrático' },
                { texto: 'Art. 2 — Unidad y autonomías' },
                { texto: 'Art. 3 — Lenguas oficiales' },
              ],
            },
            {
              texto: 'Título I — Derechos y deberes',
              hijos: [
                { texto: 'Cap. II — Derechos y libertades' },
                { texto: 'Cap. IV — Garantías' },
                { texto: 'Art. 53 — Tutela' },
              ],
            },
            { texto: 'Título II — La Corona' },
          ],
          izquierda: [
            {
              texto: 'Título III — Cortes Generales',
              hijos: [{ texto: 'Congreso: 350 diputados' }, { texto: 'Senado: territorial' }],
            },
            { texto: 'Título IV — Gobierno y Administración' },
            { texto: 'Título VI — Poder Judicial' },
            {
              texto: 'Título X — Reforma',
              hijos: [{ texto: 'Art. 167 — ordinaria' }, { texto: 'Art. 168 — agravada' }],
            },
          ],
        },
      },
    ],
  },
  {
    bloque: 'Bloque II — Derecho Administrativo',
    color: '#2F7D5F',
    temas: [
      {
        numero: 'Tema 7',
        nombre: 'El acto administrativo',
        estado: 'sin-empezar' as const,
        esquema: {
          titulo: 'El acto administrativo',
          raiz: 'Acto administrativo',
          derecha: [
            {
              texto: 'Elementos',
              hijos: [{ texto: 'Subjetivo' }, { texto: 'Objetivo' }, { texto: 'Formal' }],
            },
            { texto: 'Clases' },
          ],
          izquierda: [
            {
              texto: 'Validez',
              hijos: [{ texto: 'Nulidad: art. 47' }, { texto: 'Anulabilidad: art. 48' }],
            },
            { texto: 'Notificación y publicación' },
          ],
        },
      },
    ],
  },
]

/** Siembra el ejemplo una sola vez, y solo si la base está realmente vacía. */
export async function sembrarSiHaceFalta(): Promise<void> {
  if (await leerAjuste('sembrado', false)) return
  if ((await db.bloques.count()) > 0) {
    await escribirAjuste('sembrado', true)
    return
  }

  const bloques: Bloque[] = []
  const temas: Tema[] = []
  const esquemas: Esquema[] = []
  const nodos: Nodo[] = []

  const clavesBloque = ordenesEntre(null, null, PLAN.length)

  PLAN.forEach((entrada, i) => {
    const bloqueId = nuevoId()
    bloques.push({
      id: bloqueId,
      nombre: entrada.bloque,
      color: entrada.color,
      orden: clavesBloque[i]!,
      version: 1,
      actualizadoEn: AHORA(),
    })

    const clavesTema = ordenesEntre(null, null, entrada.temas.length)

    entrada.temas.forEach((t, j) => {
      const temaId = nuevoId()
      temas.push({
        id: temaId,
        bloqueId,
        nombre: t.nombre,
        numero: t.numero,
        orden: clavesTema[j]!,
        estado: t.estado,
        version: 1,
        actualizadoEn: AHORA(),
      })

      const montado = montarEsquema(temaId, ordenInicial(), t.esquema)
      esquemas.push(montado.esquema)
      nodos.push(...montado.nodos)
    })
  })

  await db.transaction('rw', [db.bloques, db.temas, db.esquemas, db.nodos, db.ajustes], async () => {
    await db.bloques.bulkAdd(bloques)
    await db.temas.bulkAdd(temas)
    await db.esquemas.bulkAdd(esquemas)
    await db.nodos.bulkAdd(nodos)
    await db.ajustes.put({ clave: 'sembrado', valor: true })
  })
}
