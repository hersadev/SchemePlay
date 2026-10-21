/**
 * Estado del esquema abierto, con pila de deshacer.
 *
 * Deshacer va por COMANDOS (crear, mover, borrar, editar), no por diffs del
 * estado entero. En un editor de árboles con orden fraccionario, revertir un
 * diff genérico es justo lo que corrompe el orden de los hermanos.
 *
 * Cada comando guarda las filas afectadas antes y después. Al aplicar —hacia
 * delante o hacia atrás— se vuelve a sellar `version` contra lo que hay vivo,
 * de modo que la version solo sube nunca baja: deshacer es una edición más, y
 * la fusión tiene que poder distinguirla de la original.
 */
import { create } from 'zustand'
import { db } from '../datos/db'
import { nuevoId } from '../datos/ids'
import { compararOrden, ordenEntre, ordenInicial } from '../datos/orden'
import type { Lado, Nodo } from '../datos/tipos'

export type Comando = {
  nombre: string
  antes: Nodo[]
  despues: Nodo[]
}

export type Direccion = 'arriba' | 'abajo' | 'izq' | 'der'

type Estado = {
  esquemaId: string | null
  raizId: string | null
  nodos: Map<string, Nodo>
  seleccionado: string | null
  editando: string | null
  /** Texto mientras se teclea, para que la caja crezca sobre la marcha. */
  textoVivo: string
  /**
   * Cierto hasta la primera tecla de esta sesión de edición. Marca que el
   * texto de partida sigue intacto y, por tanto, que la primera tecla debe
   * reemplazarlo en vez de añadirse.
   */
  virgen: boolean
  pila: Comando[]
  /** Cuántos comandos de la pila están aplicados. */
  puntero: number
  cargando: boolean

  abrir: (esquemaId: string, raizId: string) => Promise<void>
  cerrar: () => void

  seleccionar: (id: string | null) => void
  navegar: (direccion: Direccion) => void

  empezarEdicion: (id: string, textoInicial?: string) => void
  escribir: (texto: string) => void
  terminarEdicion: () => Promise<void>

  crearHijo: (padreId: string) => Promise<string | null>
  crearHermano: (id: string) => Promise<string | null>
  sacarNivel: (id: string) => Promise<void>
  meterNivel: (id: string) => Promise<void>
  borrar: (id: string) => Promise<void>
  alternarPliegue: (id: string) => Promise<void>
  cambiarLado: (id: string, lado: Lado) => Promise<void>
  cambiarColor: (id: string, color: string | undefined) => Promise<void>
  cambiarNotas: (id: string, notas: string) => Promise<void>

  deshacer: () => Promise<void>
  rehacer: () => Promise<void>
  puedeDeshacer: () => boolean
  puedeRehacer: () => boolean
}

/** Re-sella las filas contra lo que hay vivo: la version solo puede subir. */
function sellar(filas: Nodo[], vivos: ReadonlyMap<string, Nodo>): Nodo[] {
  const ahora = Date.now()
  return filas.map((fila) => {
    const vivo = vivos.get(fila.id)
    return {
      ...fila,
      version: Math.max(fila.version, vivo?.version ?? 0) + 1,
      actualizadoEn: ahora,
    }
  })
}

function conFilas(mapa: ReadonlyMap<string, Nodo>, filas: Nodo[]): Map<string, Nodo> {
  const copia = new Map(mapa)
  for (const fila of filas) copia.set(fila.id, fila)
  return copia
}

function hijosDe(mapa: ReadonlyMap<string, Nodo>, padreId: string): Nodo[] {
  const salida: Nodo[] = []
  for (const nodo of mapa.values()) {
    if (!nodo.borrado && nodo.padreId === padreId) salida.push(nodo)
  }
  return salida.sort(compararOrden)
}

function descendientes(mapa: ReadonlyMap<string, Nodo>, id: string): Nodo[] {
  const salida: Nodo[] = []
  const cola = [...hijosDe(mapa, id)]
  while (cola.length) {
    const nodo = cola.pop()!
    salida.push(nodo)
    cola.push(...hijosDe(mapa, nodo.id))
  }
  return salida
}

/** Lado efectivo: los descendientes heredan el del ancestro de primer nivel. */
function ladoDe(mapa: ReadonlyMap<string, Nodo>, id: string, raizId: string): Lado {
  let actual = mapa.get(id)
  while (actual && actual.padreId && actual.padreId !== raizId) {
    actual = mapa.get(actual.padreId)
  }
  if (!actual || actual.padreId === null) return 'der'
  if (actual.lado) return actual.lado
  const indice = hijosDe(mapa, raizId).findIndex((h) => h.id === actual!.id)
  return indice % 2 === 0 ? 'der' : 'izq'
}

export const usarEsquema = create<Estado>((set, get) => {
  /** Aplica un comando hacia delante y lo apila. */
  async function ejecutar(comando: Comando): Promise<void> {
    const { nodos, pila, puntero } = get()
    const filas = sellar(comando.despues, nodos)

    set({
      nodos: conFilas(nodos, filas),
      // Al ejecutar algo nuevo se tira lo que hubiera por rehacer.
      pila: [...pila.slice(0, puntero), { ...comando, despues: filas }],
      puntero: puntero + 1,
    })

    await db.nodos.bulkPut(filas)
  }

  return {
    esquemaId: null,
    raizId: null,
    nodos: new Map(),
    seleccionado: null,
    editando: null,
    textoVivo: '',
    virgen: true,
    pila: [],
    puntero: 0,
    cargando: false,

    async abrir(esquemaId, raizId) {
      set({ cargando: true, esquemaId, raizId })
      const filas = await db.nodos.where('esquemaId').equals(esquemaId).toArray()
      set({
        nodos: new Map(filas.map((f) => [f.id, f])),
        seleccionado: raizId,
        editando: null,
        textoVivo: '',
        virgen: true,
        pila: [],
        puntero: 0,
        cargando: false,
      })
    },

    cerrar() {
      set({
        esquemaId: null,
        raizId: null,
        nodos: new Map(),
        seleccionado: null,
        editando: null,
        textoVivo: '',
        virgen: true,
        pila: [],
        puntero: 0,
      })
    },

    seleccionar(id) {
      set({ seleccionado: id })
    },

    navegar(direccion) {
      const { nodos, seleccionado, raizId } = get()
      if (!seleccionado || !raizId) return
      const actual = nodos.get(seleccionado)
      if (!actual) return

      const esRaiz = actual.padreId === null
      const lado = esRaiz ? null : ladoDe(nodos, actual.id, raizId)

      // Hacia fuera abre la rama; hacia dentro sube al padre. En el lado
      // izquierdo del mapa las dos direcciones están invertidas.
      const haciaFuera: Direccion = lado === 'izq' ? 'izq' : 'der'
      const haciaDentro: Direccion = lado === 'izq' ? 'der' : 'izq'

      if (esRaiz && (direccion === 'der' || direccion === 'izq')) {
        const candidato = hijosDe(nodos, raizId).find(
          (h) => ladoDe(nodos, h.id, raizId) === (direccion === 'der' ? 'der' : 'izq'),
        )
        if (candidato) set({ seleccionado: candidato.id })
        return
      }

      if (direccion === haciaFuera) {
        if (actual.colapsado) return
        const primero = hijosDe(nodos, actual.id)[0]
        if (primero) set({ seleccionado: primero.id })
        return
      }

      if (direccion === haciaDentro) {
        if (actual.padreId) set({ seleccionado: actual.padreId })
        return
      }

      if (!actual.padreId) return
      const hermanos = hijosDe(nodos, actual.padreId)
      const i = hermanos.findIndex((h) => h.id === actual.id)
      const destino = direccion === 'arriba' ? hermanos[i - 1] : hermanos[i + 1]
      if (destino) set({ seleccionado: destino.id })
    },

    empezarEdicion(id, textoInicial) {
      const nodo = get().nodos.get(id)
      if (!nodo) return
      set({
        editando: id,
        seleccionado: id,
        textoVivo: textoInicial !== undefined ? textoInicial : nodo.texto,
        virgen: true,
      })
    },

    escribir(texto) {
      set({ textoVivo: texto, virgen: false })
    },

    async terminarEdicion() {
      const { editando, textoVivo, nodos } = get()
      if (!editando) return
      const nodo = nodos.get(editando)
      set({ editando: null, textoVivo: '', virgen: true })
      if (!nodo) return

      const limpio = textoVivo.replace(/\s+/g, ' ').trim()

      // Un nodo que se queda sin texto y sin hijos es basura visual: casi
      // siempre es uno recién creado y abandonado. Se retira solo.
      if (!limpio && nodo.padreId !== null && !hijosDe(nodos, nodo.id).length) {
        await get().borrar(nodo.id)
        return
      }

      if (limpio === nodo.texto) return

      await ejecutar({
        nombre: 'editar texto',
        antes: [nodo],
        despues: [{ ...nodo, texto: limpio }],
      })
    },

    async crearHijo(padreId) {
      const { nodos, esquemaId, raizId } = get()
      if (!esquemaId || !raizId) return null
      const padre = nodos.get(padreId)
      if (!padre) return null

      const hermanos = hijosDe(nodos, padreId)
      const ultimo = hermanos.at(-1)

      const nuevo: Nodo = {
        id: nuevoId(),
        esquemaId,
        padreId,
        texto: '',
        orden: ultimo ? ordenEntre(ultimo.orden, null) : ordenInicial(),
        colapsado: false,
        version: 0,
        actualizadoEn: Date.now(),
      }

      // Hijo directo de la raíz: cae en el lado que vaya más descargado, para
      // que el mapa no crezca siempre hacia el mismo sitio.
      if (padreId === raizId) {
        const directos = hijosDe(nodos, raizId)
        const derechas = directos.filter((h) => ladoDe(nodos, h.id, raizId) === 'der').length
        nuevo.lado = derechas <= directos.length - derechas ? 'der' : 'izq'
      }

      const antes: Nodo[] = [{ ...nuevo, borrado: true }]
      const despues: Nodo[] = [nuevo]

      // Colgar un hijo de una rama plegada tiene que desplegarla, o el nodo
      // nuevo nacería invisible y con el foco puesto en él.
      if (padre.colapsado) {
        antes.push(padre)
        despues.push({ ...padre, colapsado: false })
      }

      // `ejecutar` hace su `set` antes del primer await, así que marcar la
      // edición justo después de la llamada —sin esperarla— cierra la ventana
      // en la que el nodo ya existe pero nadie lo está editando todavía.
      const escritura = ejecutar({ nombre: 'crear hijo', antes, despues })
      get().empezarEdicion(nuevo.id, '')
      await escritura

      return nuevo.id
    },

    async crearHermano(id) {
      const { nodos, esquemaId, raizId } = get()
      if (!esquemaId || !raizId) return null
      const actual = nodos.get(id)
      if (!actual) return null

      // La raíz no tiene hermanos: lo natural es que Enter le cuelgue una rama.
      if (actual.padreId === null) return get().crearHijo(id)

      const hermanos = hijosDe(nodos, actual.padreId)
      const i = hermanos.findIndex((h) => h.id === id)
      const siguiente = hermanos[i + 1]

      const nuevo: Nodo = {
        id: nuevoId(),
        esquemaId,
        padreId: actual.padreId,
        texto: '',
        orden: ordenEntre(actual.orden, siguiente ? siguiente.orden : null),
        colapsado: false,
        version: 0,
        actualizadoEn: Date.now(),
        ...(actual.padreId === raizId ? { lado: ladoDe(nodos, id, raizId) } : {}),
      }

      const escritura = ejecutar({
        nombre: 'crear hermano',
        antes: [{ ...nuevo, borrado: true }],
        despues: [nuevo],
      })
      get().empezarEdicion(nuevo.id, '')
      await escritura

      return nuevo.id
    },

    async sacarNivel(id) {
      const { nodos, raizId } = get()
      if (!raizId) return
      const actual = nodos.get(id)
      if (!actual?.padreId) return

      const padre = nodos.get(actual.padreId)
      // Si el padre ya es la raíz, no hay nivel al que subir.
      if (!padre?.padreId) return

      const nuevosHermanos = hijosDe(nodos, padre.padreId)
      const iPadre = nuevosHermanos.findIndex((h) => h.id === padre.id)
      const siguiente = nuevosHermanos[iPadre + 1]

      const movido: Nodo = {
        ...actual,
        padreId: padre.padreId,
        orden: ordenEntre(padre.orden, siguiente ? siguiente.orden : null),
      }

      if (padre.padreId === raizId) movido.lado = ladoDe(nodos, id, raizId)
      else delete movido.lado

      await ejecutar({ nombre: 'sacar nivel', antes: [actual], despues: [movido] })
    },

    async meterNivel(id) {
      const { nodos, raizId } = get()
      if (!raizId) return
      const actual = nodos.get(id)
      if (!actual?.padreId) return

      const hermanos = hijosDe(nodos, actual.padreId)
      const i = hermanos.findIndex((h) => h.id === id)
      const anterior = hermanos[i - 1]
      // Sin hermano anterior no hay nadie bajo quien meterse.
      if (!anterior) return

      const hijosDestino = hijosDe(nodos, anterior.id)
      const movido: Nodo = {
        ...actual,
        padreId: anterior.id,
        orden: ordenEntre(hijosDestino.at(-1)?.orden ?? null, null),
      }
      delete movido.lado

      const antes: Nodo[] = [actual]
      const despues: Nodo[] = [movido]

      if (anterior.colapsado) {
        antes.push(anterior)
        despues.push({ ...anterior, colapsado: false })
      }

      await ejecutar({ nombre: 'meter nivel', antes, despues })
    },

    async borrar(id) {
      const { nodos } = get()
      const actual = nodos.get(id)
      // La raíz no se borra: sin ella el esquema no se podría abrir.
      if (!actual?.padreId) return

      const rama = [actual, ...descendientes(nodos, id)]

      await ejecutar({
        nombre: 'borrar rama',
        antes: rama,
        // Tombstone, no DELETE: así la baja viaja en el fichero de trasvase.
        despues: rama.map((n) => ({ ...n, borrado: true })),
      })

      set({ seleccionado: actual.padreId, editando: null, textoVivo: '', virgen: true })
    },

    async alternarPliegue(id) {
      const { nodos } = get()
      const actual = nodos.get(id)
      if (!actual) return
      if (!hijosDe(nodos, id).length) return

      await ejecutar({
        nombre: actual.colapsado ? 'desplegar' : 'plegar',
        antes: [actual],
        despues: [{ ...actual, colapsado: !actual.colapsado }],
      })
    },

    async cambiarLado(id, lado) {
      const { nodos, raizId } = get()
      const actual = nodos.get(id)
      if (!actual || actual.padreId !== raizId) return
      if (actual.lado === lado) return

      await ejecutar({ nombre: 'cambiar lado', antes: [actual], despues: [{ ...actual, lado }] })
    },

    async cambiarColor(id, color) {
      const { nodos } = get()
      const actual = nodos.get(id)
      if (!actual) return

      const despues: Nodo = { ...actual }
      if (color) despues.color = color
      else delete despues.color

      await ejecutar({ nombre: 'cambiar color', antes: [actual], despues: [despues] })
    },

    async cambiarNotas(id, notas) {
      const { nodos } = get()
      const actual = nodos.get(id)
      if (!actual) return
      if ((actual.notas ?? '') === notas) return

      const despues: Nodo = { ...actual }
      if (notas.trim()) despues.notas = notas
      else delete despues.notas

      await ejecutar({ nombre: 'editar notas', antes: [actual], despues: [despues] })
    },

    async deshacer() {
      const { pila, puntero, nodos } = get()
      if (puntero === 0) return
      const comando = pila[puntero - 1]!

      const filas = sellar(comando.antes, nodos)
      set({ nodos: conFilas(nodos, filas), puntero: puntero - 1, editando: null, textoVivo: '', virgen: true })
      await db.nodos.bulkPut(filas)
    },

    async rehacer() {
      const { pila, puntero, nodos } = get()
      if (puntero >= pila.length) return
      const comando = pila[puntero]!

      const filas = sellar(comando.despues, nodos)
      set({ nodos: conFilas(nodos, filas), puntero: puntero + 1, editando: null, textoVivo: '', virgen: true })
      await db.nodos.bulkPut(filas)
    },

    puedeDeshacer() {
      return get().puntero > 0
    },

    puedeRehacer() {
      const { pila, puntero } = get()
      return puntero < pila.length
    },
  }
})
