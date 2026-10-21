import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { cambiarEstadoTema } from '../datos/biblioteca'
import { db, vivas } from '../datos/db'
import { porOrden } from '../datos/orden'
import { ESTADOS_TEMA, type EstadoTema } from '../datos/tipos'

const NOMBRE_ESTADO: Record<EstadoTema, string> = {
  'sin-empezar': 'Sin empezar',
  'en-curso': 'En curso',
  repasando: 'Repasando',
  dominado: 'Dominado',
}

const COLOR_ESTADO: Record<EstadoTema, string> = {
  'sin-empezar': 'var(--tenue)',
  'en-curso': 'var(--estudio)',
  repasando: 'var(--acento)',
  dominado: 'var(--bien)',
}

export function Panel() {
  const datos = useLiveQuery(async () => {
    const [bloques, temas, esquemas, nodos] = await Promise.all([
      db.bloques.toArray(),
      db.temas.toArray(),
      db.esquemas.toArray(),
      db.nodos.toArray(),
    ])

    const nodosPorEsquema = new Map<string, number>()
    for (const nodo of vivas(nodos)) {
      nodosPorEsquema.set(nodo.esquemaId, (nodosPorEsquema.get(nodo.esquemaId) ?? 0) + 1)
    }

    return {
      bloques: porOrden(vivas(bloques)),
      temas: porOrden(vivas(temas)),
      esquemas: porOrden(vivas(esquemas)),
      nodosPorEsquema,
    }
  }, [])

  if (!datos) return <p className="p-6 text-sm text-[var(--tenue)]">Cargando…</p>

  if (datos.bloques.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="font-titulo text-3xl font-semibold text-[var(--tinta)]">
          Empieza por un bloque
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--suave)]">
          Un bloque agrupa los temas de una parte del temario. Dentro de cada tema puedes tener
          uno o varios esquemas. Crea el primero con «Nuevo bloque», en la biblioteca.
        </p>
      </div>
    )
  }

  const totalNodos = [...datos.nodosPorEsquema.values()].reduce((a, b) => a + b, 0)

  return (
    <div className="mx-auto w-full max-w-4xl overflow-y-auto p-5 pb-16">
      <header className="mb-7">
        <h1 className="font-titulo text-3xl font-semibold text-[var(--tinta)]">Tus esquemas</h1>
        <p className="mt-1.5 font-mono text-xs text-[var(--tenue)] tabular-nums">
          {datos.bloques.length} bloques · {datos.temas.length} temas ·{' '}
          {datos.esquemas.length} esquemas · {totalNodos} nodos
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {datos.bloques.map((bloque) => {
          const temas = datos.temas.filter((t) => t.bloqueId === bloque.id)

          return (
            <section key={bloque.id}>
              <h2 className="mb-3 flex items-center gap-2 font-titulo text-xl font-semibold text-[var(--tinta)]">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: bloque.color }}
                  aria-hidden="true"
                />
                {bloque.nombre}
              </h2>

              {temas.length === 0 ? (
                <p className="text-sm text-[var(--tenue)]">Sin temas todavía.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {temas.map((tema) => {
                    const esquemas = datos.esquemas.filter((e) => e.temaId === tema.id)

                    return (
                      <li
                        key={tema.id}
                        className="flex flex-col gap-2.5 rounded-xl border border-[var(--linea)] bg-[var(--lamina)] p-3.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold leading-snug text-[var(--tinta)]">
                            {tema.numero && (
                              <span className="font-mono text-[11px] text-[var(--tenue)]">
                                {tema.numero}{' '}
                              </span>
                            )}
                            {tema.nombre}
                          </h3>
                          <span
                            className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                            style={{ background: COLOR_ESTADO[tema.estado] }}
                            aria-hidden="true"
                          />
                        </div>

                        {esquemas.length > 0 && (
                          <ul className="flex flex-col gap-1">
                            {esquemas.map((esquema) => (
                              <li key={esquema.id}>
                                <Link
                                  to={`/esquema/${esquema.id}`}
                                  className="flex items-baseline justify-between gap-2 rounded-md px-1.5 py-1 text-[13px] text-[var(--acento)] hover:bg-[var(--acento-suave)]"
                                >
                                  <span className="truncate">{esquema.titulo}</span>
                                  <span className="shrink-0 font-mono text-[11px] text-[var(--tenue)] tabular-nums">
                                    {datos.nodosPorEsquema.get(esquema.id) ?? 0}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}

                        <label className="mt-auto flex items-center gap-2 text-[11px] text-[var(--tenue)]">
                          <span className="uppercase tracking-wide">Estado</span>
                          <select
                            value={tema.estado}
                            onChange={(e) =>
                              void cambiarEstadoTema(tema.id, e.target.value as EstadoTema)
                            }
                            aria-label={`Estado de ${tema.nombre}`}
                            className="flex-1 rounded-md border border-[var(--linea)] bg-[var(--fondo)] px-1.5 py-1 text-[12px] text-[var(--tinta)] outline-none focus:border-[var(--acento)]"
                          >
                            {ESTADOS_TEMA.map((estado) => (
                              <option key={estado} value={estado}>
                                {NOMBRE_ESTADO[estado]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
