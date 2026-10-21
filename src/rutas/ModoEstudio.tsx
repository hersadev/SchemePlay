import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../datos/db'
import { usarEsquema } from '../estado/almacenEsquema'
import { CALIDADES, type Calidad, enCuantosDias } from '../estudio/sm2'
import { colocar } from '../lienzo/layout'
import { NodoMental } from '../lienzo/NodoMental'
import { usarViewport } from '../lienzo/usarViewport'
import { Boton } from '../ui/Boton'
import { IconoEncajar, IconoMas, IconoMenos } from '../ui/iconos'

/**
 * Modo estudio.
 *
 * El esquema no es el producto final, es el material de repaso: aquí se tapa
 * de tres maneras distintas y lo vas destapando mientras intentas recordar.
 *
 * Todo el tapado es capa de pintura: no toca la base. Lo único que se escribe
 * es la valoración de cada nodo, que es lo que reprograma el repaso.
 */
type Modo = 'progresivo' | 'hojas' | 'recitar'

const MODOS: ReadonlyArray<{ valor: Modo; etiqueta: string; explicacion: string }> = [
  {
    valor: 'progresivo',
    etiqueta: 'Revelado progresivo',
    explicacion: 'Todo tapado. Vas abriendo ramas intentando recordar antes qué había debajo.',
  },
  {
    valor: 'hojas',
    etiqueta: 'Hojas tapadas',
    explicacion: 'Se ve el esqueleto, pero los nodos finales están cubiertos.',
  },
  {
    valor: 'recitar',
    etiqueta: 'Recitar el tema',
    explicacion: 'Solo queda la raíz. Reconstrúyelo de memoria y luego compara.',
  },
]

export function ModoEstudio() {
  const { esquemaId = '' } = useParams()
  const contenedor = useRef<HTMLDivElement>(null)

  const [modo, setModo] = useState<Modo>('progresivo')
  const [destapados, setDestapados] = useState<Set<string>>(new Set())
  const [valorado, setValorado] = useState<string | null>(null)

  const esquema = useLiveQuery(() => db.esquemas.get(esquemaId), [esquemaId])

  const nodos = usarEsquema((s) => s.nodos)
  const seleccionado = usarEsquema((s) => s.seleccionado)
  const abiertoId = usarEsquema((s) => s.esquemaId)
  const abrir = usarEsquema((s) => s.abrir)
  const cerrar = usarEsquema((s) => s.cerrar)

  useEffect(() => {
    if (!esquema || esquema.borrado) return
    void abrir(esquema.id, esquema.nodoRaizId)
    return () => cerrar()
  }, [esquema?.id, esquema?.nodoRaizId, esquema?.borrado, abrir, cerrar])

  // Cambiar de modo vuelve a tapar: si no, al tercer modo ya estaría todo
  // abierto y no quedaría nada que recordar.
  useEffect(() => {
    setDestapados(new Set())
  }, [modo, esquemaId])

  const raizId = esquema?.nodoRaizId ?? ''

  /**
   * El tapado se hace plegando una COPIA de los nodos, no los de verdad: así
   * el estado de pliegue que tengas al editar no se altera por estudiar.
   */
  const nodosTapados = useMemo(() => {
    if (!raizId) return nodos

    const hijosDe = new Map<string, string[]>()
    for (const n of nodos.values()) {
      if (n.borrado || !n.padreId) continue
      const lista = hijosDe.get(n.padreId)
      if (lista) lista.push(n.id)
      else hijosDe.set(n.padreId, [n.id])
    }

    const copia = new Map(nodos)
    for (const n of nodos.values()) {
      if (n.borrado) continue
      const tieneHijos = (hijosDe.get(n.id) ?? []).length > 0
      if (!tieneHijos) continue
      if (destapados.has(n.id)) {
        copia.set(n.id, { ...n, colapsado: false })
        continue
      }

      const tapar =
        modo === 'recitar'
          ? n.id === raizId
          : modo === 'progresivo'
            ? true
            : // «hojas»: se pliega el último nivel con hijos, que son los que
              // sujetan las respuestas concretas.
              (hijosDe.get(n.id) ?? []).every((h) => (hijosDe.get(h) ?? []).length === 0)

      copia.set(n.id, { ...n, colapsado: tapar })
    }
    return copia
  }, [nodos, destapados, modo, raizId])

  const mapa = useMemo(
    () => (raizId ? colocar(nodosTapados, raizId) : null),
    [nodosTapados, raizId],
  )

  const limites = mapa?.limites ?? { x1: 0, y1: 0, x2: 0, y2: 0 }
  const { vista, manejadores, encajar, escalar } = usarViewport(contenedor, limites)

  const recolocar = useRef('')
  useEffect(() => {
    if (!mapa?.nodos.length) return
    const huella = `${esquemaId}:${modo}:${destapados.size}`
    if (recolocar.current === huella) return
    recolocar.current = huella
    encajar()
  }, [esquemaId, modo, destapados.size, mapa?.nodos.length, encajar])

  if (esquema === undefined) {
    return <p className="p-6 text-sm text-[var(--tenue)]">Abriendo el esquema…</p>
  }
  if (!esquema || esquema.borrado || !mapa) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-[var(--suave)]">Este esquema ya no existe.</p>
        <Link to="/" className="text-sm text-[var(--acento)]">
          Volver a la biblioteca
        </Link>
      </div>
    )
  }

  const nodoActual = seleccionado ? nodos.get(seleccionado) : undefined
  const puedeValorar = Boolean(nodoActual && nodoActual.padreId !== null)

  function destapar(id: string) {
    setDestapados((previos) => new Set(previos).add(id))
  }

  async function valorar(calidad: Calidad) {
    if (!seleccionado) return
    await usarEsquema.getState().valorar(seleccionado, calidad)
    setValorado(seleccionado)
    setTimeout(() => setValorado(null), 1200)
  }

  const abiertoCorrecto = abiertoId === esquema.id

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--linea)] px-3 py-2">
        <Link
          to={`/esquema/${esquema.id}`}
          className="text-sm text-[var(--acento)]"
          onClick={() => cerrar()}
        >
          ← Salir del modo estudio
        </Link>
        <span className="truncate font-titulo text-base font-semibold text-[var(--tinta)]">
          {esquema.titulo}
        </span>

        <div className="ml-auto flex flex-wrap gap-1.5">
          {MODOS.map((m) => (
            <Boton
              key={m.valor}
              variante={modo === m.valor ? 'solido' : 'suave'}
              tamano="pequeno"
              onClick={() => setModo(m.valor)}
              title={m.explicacion}
              aria-pressed={modo === m.valor}
            >
              {m.etiqueta}
            </Boton>
          ))}
        </div>
      </div>

      <p className="shrink-0 border-b border-[var(--linea)] bg-[var(--hundido)] px-3 py-1.5 text-xs text-[var(--suave)]">
        {MODOS.find((m) => m.valor === modo)?.explicacion} Toca el contador de una rama para
        destaparla.
      </p>

      {!abiertoCorrecto ? (
        <p className="p-6 text-sm text-[var(--tenue)]">Cargando los nodos…</p>
      ) : (
        <div
          ref={contenedor}
          {...manejadores}
          onDoubleClick={() => encajar()}
          className="relative min-h-0 flex-1 overflow-hidden"
          style={{
            touchAction: 'none',
            backgroundColor: 'var(--fondo)',
            backgroundImage: 'radial-gradient(var(--linea) 1px, transparent 1px)',
            backgroundSize: `${24 * vista.k}px ${24 * vista.k}px`,
            backgroundPosition: `${vista.tx}px ${vista.ty}px`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${vista.tx}px, ${vista.ty}px) scale(${vista.k})`,
              transformOrigin: '0 0',
            }}
          >
            <svg
              width={1}
              height={1}
              style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
              aria-hidden="true"
            >
              {mapa.ramas.map((rama) => (
                <path key={rama.id} d={rama.d} fill={rama.color} />
              ))}
            </svg>

            {mapa.nodos.map((colocado) => (
              <NodoMental
                key={colocado.id}
                colocado={colocado}
                seleccionado={seleccionado === colocado.id}
                editando={false}
                textoVivo=""
                virgen
                escala={vista.k}
                alSeleccionar={usarEsquema.getState().seleccionar}
                alEditar={() => undefined}
                alAlternarPliegue={destapar}
                alEscribir={() => undefined}
                alPerderFoco={() => undefined}
                alTeclearEditando={() => undefined}
                alArrastrar={() => undefined}
                alSoltarArrastre={() => undefined}
              />
            ))}
          </div>

          <div className="absolute bottom-3 right-3 flex gap-1.5">
            <Boton icono onClick={() => escalar(1 / 1.2)} aria-label="Alejar">
              <IconoMenos />
            </Boton>
            <Boton icono onClick={() => escalar(1.2)} aria-label="Acercar">
              <IconoMas />
            </Boton>
            <Boton icono onClick={encajar} aria-label="Encajar en pantalla">
              <IconoEncajar />
            </Boton>
          </div>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--linea)] bg-[var(--lamina)] px-3 py-2">
        {puedeValorar ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--suave)]">
              {valorado === seleccionado ? (
                <strong className="text-[var(--bien)]">
                  Guardado
                  {nodoActual?.repasarEn
                    ? ` · vuelve en ${Math.max(1, enCuantosDias(nodoActual.repasarEn))} días`
                    : ''}
                </strong>
              ) : (
                <>
                  ¿Cómo llevas <strong className="text-[var(--tinta)]">{nodoActual?.texto}</strong>?
                </>
              )}
            </span>
            {CALIDADES.map((c) => (
              <Boton
                key={c.valor}
                variante={c.valor === 5 ? 'solido' : 'suave'}
                tamano="pequeno"
                onClick={() => void valorar(c.valor)}
                title={c.pista}
              >
                {c.etiqueta}
              </Boton>
            ))}
          </>
        ) : (
          <span className="text-sm text-[var(--tenue)]">
            Selecciona un nodo para valorar cómo lo llevas. La raíz no se valora: es el título.
          </span>
        )}
      </div>
    </div>
  )
}
