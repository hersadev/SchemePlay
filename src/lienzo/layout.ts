/**
 * Layout del mapa mental: de un árbol de nodos a coordenadas.
 *
 * Raíz en el centro, ramas que salen a izquierda y derecha, cada rama con su
 * color. No hay posiciones guardadas en la base: el layout es una función pura
 * del árbol, así que nunca puede quedar «descolocado» ni hay que repararlo.
 */
import { compararOrden } from '../datos/orden'
import type { Lado, Nodo } from '../datos/tipos'
import { colorDeRama, HUECO_X, huecoY, grosorRama } from './estilo'
import { medirNodo } from './medir'
import { caminoRama } from './ramas'

export type Colocado = {
  id: string
  x: number
  y: number
  ancho: number
  alto: number
  lineas: string[]
  profundidad: number
  lado: Lado
  color: string
  padreId: string | null
  /** Hijos vivos. Si está colapsado, siguen contando. */
  hijos: number
  colapsado: boolean
  /** Descendientes escondidos por el pliegue. 0 si está desplegado. */
  ocultos: number
}

export type RamaDibujada = {
  id: string
  d: string
  color: string
}

export type Limites = { x1: number; y1: number; x2: number; y2: number }

export type MapaColocado = {
  nodos: Colocado[]
  ramas: RamaDibujada[]
  limites: Limites
  porId: Map<string, Colocado>
}

const LADOS: readonly Lado[] = ['der', 'izq']

export type OpcionesLayout = {
  /**
   * Texto que está escribiéndose ahora mismo, para que la caja crezca a la vez
   * que se teclea en vez de dar un salto al confirmar.
   */
  enEdicion?: { id: string; texto: string }
  /**
   * Arrastre en curso. Se suma al desplazamiento ya guardado sin tocar la base:
   * al pasar por el layout, la rama entera sigue al nodo mientras lo mueves, en
   * vez de quedarse el nodo suelto y las ramas rotas hasta soltar.
   */
  arrastre?: { id: string; dx: number; dy: number }
}

export function colocar(
  nodos: ReadonlyMap<string, Nodo>,
  raizId: string,
  opciones: OpcionesLayout = {},
): MapaColocado {
  const vacio: MapaColocado = {
    nodos: [],
    ramas: [],
    limites: { x1: 0, y1: 0, x2: 0, y2: 0 },
    porId: new Map(),
  }

  const raiz = nodos.get(raizId)
  if (!raiz || raiz.borrado) return vacio

  // --- índice de hijos, ya ordenado y sin tombstones ---
  const hijosDe = new Map<string, Nodo[]>()
  for (const nodo of nodos.values()) {
    if (nodo.borrado || nodo.padreId === null) continue
    if (!nodos.has(nodo.padreId)) continue
    const lista = hijosDe.get(nodo.padreId)
    if (lista) lista.push(nodo)
    else hijosDe.set(nodo.padreId, [nodo])
  }
  for (const lista of hijosDe.values()) lista.sort(compararOrden)

  const textoDe = (nodo: Nodo): string =>
    opciones.enEdicion?.id === nodo.id ? opciones.enEdicion.texto : nodo.texto

  // --- profundidad, lado y color heredados en una sola bajada ---
  type Rasgos = { profundidad: number; lado: Lado; color: string }
  const rasgos = new Map<string, Rasgos>()
  rasgos.set(raizId, { profundidad: 0, lado: 'der', color: '' })

  const directos = hijosDe.get(raizId) ?? []
  directos.forEach((hijo, i) => {
    // El lado guardado manda; si no hay, alternan para repartirse el espacio.
    const lado: Lado = hijo.lado ?? (i % 2 === 0 ? 'der' : 'izq')
    const color = hijo.color ?? colorDeRama(i)
    rasgos.set(hijo.id, { profundidad: 1, lado, color })
  })

  const pendientes = [...directos.map((h) => h.id)]
  while (pendientes.length) {
    const actualId = pendientes.pop()!
    const padre = rasgos.get(actualId)!
    for (const hijo of hijosDe.get(actualId) ?? []) {
      rasgos.set(hijo.id, {
        profundidad: padre.profundidad + 1,
        lado: padre.lado,
        color: hijo.color ?? padre.color,
      })
      pendientes.push(hijo.id)
    }
  }

  // --- medidas ---
  const medidas = new Map<string, Colocado>()
  for (const [id, rasgo] of rasgos) {
    const nodo = nodos.get(id)!
    const medida = medirNodo(textoDe(nodo), rasgo.profundidad)
    const hijos = hijosDe.get(id) ?? []

    medidas.set(id, {
      id,
      x: 0,
      y: 0,
      ancho: medida.ancho,
      alto: medida.alto,
      lineas: medida.lineas,
      profundidad: rasgo.profundidad,
      lado: rasgo.lado,
      color: rasgo.color,
      padreId: nodo.padreId,
      hijos: hijos.length,
      colapsado: nodo.colapsado && hijos.length > 0,
      ocultos: 0,
    })
  }

  const contarDescendientes = (id: string): number => {
    let total = 0
    const cola = [...(hijosDe.get(id) ?? [])]
    while (cola.length) {
      const n = cola.pop()!
      total += 1
      cola.push(...(hijosDe.get(n.id) ?? []))
    }
    return total
  }

  // --- colocación ---
  const colocados = new Map<string, Colocado>()
  const raizMedida = medidas.get(raizId)!
  const raizX = -raizMedida.ancho / 2
  const raizY = -raizMedida.alto / 2

  /**
   * `xBorde` es el canto del nodo que mira al padre: el izquierdo si la rama
   * va hacia la derecha, el derecho si va hacia la izquierda. Así la función no
   * necesita saber el ancho del hijo antes de medirlo.
   */
  function disponer(id: string, xBorde: number, cursorY: number, salida: Map<string, Colocado>): number {
    const base = medidas.get(id)!
    const x = base.lado === 'der' ? xBorde : xBorde - base.ancho
    const hijos = base.colapsado ? [] : (hijosDe.get(id) ?? [])
    const propio = base.alto + huecoY(base.profundidad)

    if (hijos.length === 0) {
      salida.set(id, {
        ...base,
        x,
        y: cursorY,
        ocultos: base.colapsado ? contarDescendientes(id) : 0,
      })
      return propio
    }

    const xHijos = base.lado === 'der' ? x + base.ancho + HUECO_X : x - HUECO_X

    let y = cursorY
    for (const hijo of hijos) y += disponer(hijo.id, xHijos, y, salida)

    const primero = salida.get(hijos[0]!.id)!
    const ultimo = salida.get(hijos.at(-1)!.id)!
    const centro = (primero.y + primero.alto / 2 + (ultimo.y + ultimo.alto / 2)) / 2

    salida.set(id, { ...base, x, y: centro - base.alto / 2, ocultos: 0 })
    return Math.max(y - cursorY, propio)
  }

  // Plegar la raíz esconde el mapa entero. El `colapsado` de dentro de
  // `disponer` solo salta los hijos del nodo que se está colocando, y los hijos
  // de la raíz los reparte este bucle: sin esta guarda, plegar la raíz no
  // escondía nada.
  for (const lado of raizMedida.colapsado ? [] : LADOS) {
    const delLado = directos.filter((h) => medidas.get(h.id)!.lado === lado)
    if (!delLado.length) continue

    const xBorde = lado === 'der' ? raizX + raizMedida.ancho + HUECO_X : raizX - HUECO_X

    // Cada lado se compone aparte y luego se centra sobre la raíz: así una rama
    // izquierda muy cargada no empuja a la derecha hacia abajo.
    const parcial = new Map<string, Colocado>()
    let y = 0
    for (const hijo of delLado) y += disponer(hijo.id, xBorde, y, parcial)

    let arriba = Infinity
    let abajo = -Infinity
    for (const c of parcial.values()) {
      arriba = Math.min(arriba, c.y)
      abajo = Math.max(abajo, c.y + c.alto)
    }
    const desplazamiento = -(arriba + abajo) / 2

    for (const c of parcial.values()) {
      colocados.set(c.id, { ...c, y: c.y + desplazamiento })
    }
  }

  colocados.set(raizId, {
    ...raizMedida,
    x: raizX,
    y: raizY,
    ocultos: raizMedida.colapsado ? contarDescendientes(raizId) : 0,
  })

  // --- desplazamientos manuales ---
  // Se acumulan de padres a hijos para que al mover un nodo le siga su rama
  // entera. Hacerlo en una pasada aparte, y no dentro de `disponer`, mantiene
  // el layout automático intacto: «reorganizar» es borrar estos dos campos.
  const pendienteDesp: Array<{ id: string; dx: number; dy: number }> = [
    { id: raizId, dx: 0, dy: 0 },
  ]
  while (pendienteDesp.length) {
    const { id, dx, dy } = pendienteDesp.pop()!
    const nodo = nodos.get(id)
    const puesto = colocados.get(id)
    if (!puesto) continue

    const vivo = opciones.arrastre?.id === id ? opciones.arrastre : null
    const acumX = dx + (nodo?.despX ?? 0) + (vivo?.dx ?? 0)
    const acumY = dy + (nodo?.despY ?? 0) + (vivo?.dy ?? 0)

    if (acumX !== 0 || acumY !== 0) {
      colocados.set(id, { ...puesto, x: puesto.x + acumX, y: puesto.y + acumY })
    }
    for (const hijo of hijosDe.get(id) ?? []) {
      pendienteDesp.push({ id: hijo.id, dx: acumX, dy: acumY })
    }
  }

  // --- ramas ---
  const ramas: RamaDibujada[] = []
  for (const hijo of colocados.values()) {
    if (!hijo.padreId) continue
    const padre = colocados.get(hijo.padreId)
    if (!padre) continue

    const haciaDerecha = hijo.lado === 'der'
    const sx = haciaDerecha ? padre.x + padre.ancho : padre.x
    const sy = padre.y + padre.alto / 2
    const tx = haciaDerecha ? hijo.x : hijo.x + hijo.ancho
    const ty = hijo.y + hijo.alto / 2

    const [ini, fin] = grosorRama(hijo.profundidad)
    ramas.push({ id: hijo.id, d: caminoRama(sx, sy, tx, ty, ini, fin), color: hijo.color })
  }

  // --- límites, con margen para que los nodos no toquen el borde al encajar ---
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (const c of colocados.values()) {
    x1 = Math.min(x1, c.x)
    y1 = Math.min(y1, c.y)
    x2 = Math.max(x2, c.x + c.ancho)
    y2 = Math.max(y2, c.y + c.alto)
  }
  const margen = 48

  return {
    nodos: [...colocados.values()].sort((a, b) => a.profundidad - b.profundidad),
    ramas,
    limites: { x1: x1 - margen, y1: y1 - margen, x2: x2 + margen, y2: y2 + margen },
    porId: colocados,
  }
}
