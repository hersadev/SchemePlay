import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  borrarBloque,
  borrarEsquema,
  borrarTema,
  crearBloque,
  crearEsquema,
  crearTema,
} from '../datos/biblioteca'
import { db, vivas } from '../datos/db'
import { porOrden } from '../datos/orden'
import type { Bloque, Esquema, EstadoTema, Tema } from '../datos/tipos'
import { Boton } from './Boton'
import { IconoFlecha, IconoMas, IconoPapelera } from './iconos'

const COLOR_ESTADO: Record<EstadoTema, string> = {
  'sin-empezar': 'var(--tenue)',
  'en-curso': 'var(--estudio)',
  repasando: 'var(--acento)',
  dominado: 'var(--bien)',
}

const NOMBRE_ESTADO: Record<EstadoTema, string> = {
  'sin-empezar': 'Sin empezar',
  'en-curso': 'En curso',
  repasando: 'Repasando',
  dominado: 'Dominado',
}

type Arbol = {
  bloques: Bloque[]
  temas: Map<string, Tema[]>
  esquemas: Map<string, Esquema[]>
}

function agrupar<T extends { id: string }>(filas: T[], clave: (f: T) => string): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const fila of filas) {
    const k = clave(fila)
    const lista = mapa.get(k)
    if (lista) lista.push(fila)
    else mapa.set(k, [fila])
  }
  return mapa
}

export function Biblioteca({ alNavegar }: { alNavegar?: () => void }) {
  const { esquemaId } = useParams()
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [creando, setCreando] = useState<string | null>(null)

  // Una sola consulta viva para todo el árbol: son pocas filas y así se evita
  // llamar a useLiveQuery dentro de un bucle.
  const arbol = useLiveQuery<Arbol>(async () => {
    const [bloques, temas, esquemas] = await Promise.all([
      db.bloques.toArray(),
      db.temas.toArray(),
      db.esquemas.toArray(),
    ])
    return {
      bloques: porOrden(vivas(bloques)),
      temas: agrupar(porOrden(vivas(temas)), (t) => t.bloqueId),
      esquemas: agrupar(porOrden(vivas(esquemas)), (e) => e.temaId),
    }
  }, [])

  function alternar(id: string) {
    setAbiertos((previos) => {
      const copia = new Set(previos)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  }

  if (!arbol) {
    return <p className="p-4 text-sm text-[var(--tenue)]">Abriendo la biblioteca…</p>
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {arbol.bloques.length === 0 && (
          <p className="px-2 py-6 text-sm leading-relaxed text-[var(--tenue)]">
            Aún no hay bloques. Crea el primero y mete dentro los temas de la oposición.
          </p>
        )}

        <ul className="flex flex-col gap-0.5">
          {arbol.bloques.map((bloque) => {
            const temas = arbol.temas.get(bloque.id) ?? []
            const abierto = abiertos.has(bloque.id)

            return (
              <li key={bloque.id}>
                <div className="group flex items-center gap-1 rounded-md pr-1 hover:bg-[var(--hundido)]">
                  <button
                    type="button"
                    onClick={() => alternar(bloque.id)}
                    aria-expanded={abierto}
                    title={bloque.nombre}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-2 text-left"
                  >
                    <span
                      className="shrink-0 text-[var(--tenue)] transition-transform"
                      style={{ transform: abierto ? 'rotate(90deg)' : 'none' }}
                    >
                      <IconoFlecha tamano={14} />
                    </span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ background: bloque.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--tinta)]">
                      {bloque.nombre}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--tenue)]">
                      {temas.length}
                    </span>
                  </button>

                  <div className="acciones-fila flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <Boton
                      variante="fantasma"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setCreando(`tema:${bloque.id}`)
                        setAbiertos((p) => new Set(p).add(bloque.id))
                      }}
                      title="Nuevo tema"
                      aria-label={`Nuevo tema en ${bloque.nombre}`}
                    >
                      <IconoMas tamano={15} />
                    </Boton>
                    <Boton
                      variante="fantasma"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (confirm(`¿Borrar «${bloque.nombre}» con sus ${temas.length} temas?`)) {
                          void borrarBloque(bloque.id)
                        }
                      }}
                      title="Borrar bloque"
                      aria-label={`Borrar ${bloque.nombre}`}
                    >
                      <IconoPapelera tamano={15} />
                    </Boton>
                  </div>
                </div>

                {abierto && (
                  <ul className="ml-4 flex flex-col gap-0.5 border-l border-[var(--linea)] pl-2">
                    {temas.map((tema) => {
                      const esquemas = arbol.esquemas.get(tema.id) ?? []
                      const temaAbierto = abiertos.has(tema.id)

                      return (
                        <li key={tema.id}>
                          <div className="group flex items-center gap-1 rounded-md pr-1 hover:bg-[var(--hundido)]">
                            <button
                              type="button"
                              onClick={() => alternar(tema.id)}
                              aria-expanded={temaAbierto}
                              title={`${tema.numero ? `${tema.numero} · ` : ''}${tema.nombre}`}
                              className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left"
                            >
                              <span
                                className="shrink-0 text-[var(--tenue)] transition-transform"
                                style={{ transform: temaAbierto ? 'rotate(90deg)' : 'none' }}
                              >
                                <IconoFlecha tamano={13} />
                              </span>
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ background: COLOR_ESTADO[tema.estado] }}
                                title={NOMBRE_ESTADO[tema.estado]}
                              />
                              <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--tinta)]">
                                {tema.numero ? `${tema.numero} · ` : ''}
                                {tema.nombre}
                              </span>
                            </button>

                            <div className="acciones-fila flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                              <Boton
                                variante="fantasma"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setCreando(`esquema:${tema.id}`)
                                  setAbiertos((p) => new Set(p).add(tema.id))
                                }}
                                title="Nuevo esquema"
                                aria-label={`Nuevo esquema en ${tema.nombre}`}
                              >
                                <IconoMas tamano={14} />
                              </Boton>
                              <Boton
                                variante="fantasma"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  if (confirm(`¿Borrar el tema «${tema.nombre}» y sus esquemas?`)) {
                                    void borrarTema(tema.id)
                                  }
                                }}
                                title="Borrar tema"
                                aria-label={`Borrar ${tema.nombre}`}
                              >
                                <IconoPapelera tamano={14} />
                              </Boton>
                            </div>
                          </div>

                          {temaAbierto && (
                            <ul className="ml-4 flex flex-col gap-0.5 border-l border-[var(--linea)] pl-2">
                              {esquemas.map((esquema) => (
                                <li
                                  key={esquema.id}
                                  className="group flex items-center gap-1 rounded-md pr-1 hover:bg-[var(--hundido)]"
                                >
                                  <Link
                                    to={`/esquema/${esquema.id}`}
                                    onClick={alNavegar}
                                    className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-[13px] ${
                                      esquemaId === esquema.id
                                        ? 'bg-[var(--acento-suave)] font-semibold text-[var(--acento)]'
                                        : 'text-[var(--suave)]'
                                    }`}
                                  >
                                    {esquema.titulo}
                                  </Link>
                                  <div className="acciones-fila shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                    <Boton
                                      variante="fantasma"
                                      className="h-8 w-8 p-0"
                                      onClick={() => {
                                        if (confirm(`¿Borrar el esquema «${esquema.titulo}»?`)) {
                                          void borrarEsquema(esquema.id)
                                        }
                                      }}
                                      title="Borrar esquema"
                                      aria-label={`Borrar ${esquema.titulo}`}
                                    >
                                      <IconoPapelera tamano={14} />
                                    </Boton>
                                  </div>
                                </li>
                              ))}

                              {creando === `esquema:${tema.id}` && (
                                <NuevaEntrada
                                  etiqueta="Título del esquema"
                                  alConfirmar={async (titulo) => {
                                    await crearEsquema(tema.id, titulo)
                                    setCreando(null)
                                  }}
                                  alCancelar={() => setCreando(null)}
                                />
                              )}

                              {esquemas.length === 0 && creando !== `esquema:${tema.id}` && (
                                <li className="px-2 py-1.5 text-xs text-[var(--tenue)]">
                                  Sin esquemas todavía
                                </li>
                              )}
                            </ul>
                          )}
                        </li>
                      )
                    })}

                    {creando === `tema:${bloque.id}` && (
                      <NuevaEntrada
                        etiqueta="Nombre del tema"
                        alConfirmar={async (nombre) => {
                          // «Tema 3 — La Constitución» se parte en número y nombre.
                          const m = /^\s*(tema\s*\d+)\s*[-—:.]?\s*(.*)$/i.exec(nombre)
                          await crearTema(bloque.id, m?.[2] || nombre, m?.[1])
                          setCreando(null)
                        }}
                        alCancelar={() => setCreando(null)}
                      />
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>

        {creando === 'bloque' && (
          <ul className="mt-0.5">
            <NuevaEntrada
              etiqueta="Nombre del bloque"
              alConfirmar={async (nombre) => {
                await crearBloque(nombre)
                setCreando(null)
              }}
              alCancelar={() => setCreando(null)}
            />
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--linea)] p-2">
        <Boton className="w-full" onClick={() => setCreando('bloque')}>
          <IconoMas tamano={16} />
          Nuevo bloque
        </Boton>
      </div>
    </div>
  )
}

function NuevaEntrada({
  etiqueta,
  alConfirmar,
  alCancelar,
}: {
  etiqueta: string
  alConfirmar: (valor: string) => Promise<void>
  alCancelar: () => void
}) {
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function confirmar() {
    if (!valor.trim() || guardando) return
    setGuardando(true)
    await alConfirmar(valor)
  }

  return (
    <li className="px-1 py-1">
      <input
        autoFocus
        value={valor}
        placeholder={etiqueta}
        aria-label={etiqueta}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => (valor.trim() ? void confirmar() : alCancelar())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void confirmar()
          if (e.key === 'Escape') alCancelar()
        }}
        className="w-full rounded-md border border-[var(--acento)] bg-[var(--lamina)] px-2 py-1.5 text-[13px] text-[var(--tinta)] outline-none"
      />
    </li>
  )
}
