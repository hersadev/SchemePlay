import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db, vivas } from '../datos/db'
import { porOrden } from '../datos/orden'
import type { Nodo } from '../datos/tipos'
import {
  COLOR_ESTADO,
  NOMBRE_ESTADO,
  PROGRESO_VACIO,
  estadoPorProgreso,
  progresoDe,
  sumarProgresos,
  type Progreso,
} from '../estudio/progreso'
import { toca } from '../estudio/sm2'

function Barra({ progreso }: { progreso: Progreso }) {
  const color = COLOR_ESTADO[estadoPorProgreso(progreso)]
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--hundido)]"
      role="img"
      aria-label={`${progreso.porcentaje} por ciento dominado`}
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${progreso.porcentaje}%`, background: color }}
      />
    </div>
  )
}

export function Panel() {
  const datos = useLiveQuery(async () => {
    const ahora = Date.now()
    const [bloques, temas, esquemas, nodos] = await Promise.all([
      db.bloques.toArray(),
      db.temas.toArray(),
      db.esquemas.toArray(),
      db.nodos.toArray(),
    ])

    const nodosPorEsquema = new Map<string, Nodo[]>()
    for (const nodo of vivas(nodos)) {
      const lista = nodosPorEsquema.get(nodo.esquemaId)
      if (lista) lista.push(nodo)
      else nodosPorEsquema.set(nodo.esquemaId, [nodo])
    }

    const vivosEsquemas = porOrden(vivas(esquemas))
    const progresoEsquema = new Map<string, Progreso>(
      vivosEsquemas.map((e) => [e.id, progresoDe(nodosPorEsquema.get(e.id) ?? [])]),
    )

    const vivosTemas = porOrden(vivas(temas))
    const progresoTema = new Map<string, Progreso>(
      vivosTemas.map((t) => [
        t.id,
        sumarProgresos(
          vivosEsquemas
            .filter((e) => e.temaId === t.id)
            .map((e) => progresoEsquema.get(e.id) ?? PROGRESO_VACIO),
        ),
      ]),
    )

    const pendientes = vivas(nodos).filter(
      (n) => n.padreId !== null && toca(n.repasarEn, ahora),
    ).length

    return {
      bloques: porOrden(vivas(bloques)),
      temas: vivosTemas,
      esquemas: vivosEsquemas,
      nodosPorEsquema,
      progresoEsquema,
      progresoTema,
      pendientes,
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

  const global = sumarProgresos([...datos.progresoTema.values()])

  return (
    <div className="mx-auto w-full max-w-4xl overflow-y-auto p-5 pb-16">
      <header className="mb-7">
        <h1 className="font-titulo text-3xl font-semibold text-[var(--tinta)]">Tus esquemas</h1>
        <p className="mt-1.5 font-mono text-xs text-[var(--tenue)] tabular-nums">
          {datos.bloques.length} bloques · {datos.temas.length} temas ·{' '}
          {datos.esquemas.length} esquemas · {global.total} nodos
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="min-w-[14rem] flex-1">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
                Dominado
              </span>
              <span className="font-mono text-sm text-[var(--tinta)] tabular-nums">
                {global.porcentaje}%{' '}
                <span className="text-[var(--tenue)]">
                  ({global.dominados}/{global.total})
                </span>
              </span>
            </div>
            <Barra progreso={global} />
          </div>

          {datos.pendientes > 0 && (
            <Link
              to="/repaso"
              className="rounded-lg border border-[var(--estudio)] bg-[var(--estudio-suave)] px-3.5 py-2 text-sm font-medium text-[var(--tinta)]"
            >
              {datos.pendientes} {datos.pendientes === 1 ? 'nodo' : 'nodos'} para repasar hoy →
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-8">
        {datos.bloques.map((bloque) => {
          const temas = datos.temas.filter((t) => t.bloqueId === bloque.id)
          const delBloque = sumarProgresos(
            temas.map((t) => datos.progresoTema.get(t.id) ?? PROGRESO_VACIO),
          )

          return (
            <section key={bloque.id}>
              <h2 className="mb-1 flex items-center gap-2 font-titulo text-xl font-semibold text-[var(--tinta)]">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: bloque.color }}
                  aria-hidden="true"
                />
                {bloque.nombre}
                <span className="ml-auto font-mono text-xs font-normal text-[var(--tenue)] tabular-nums">
                  {delBloque.porcentaje}%
                </span>
              </h2>
              <div className="mb-3">
                <Barra progreso={delBloque} />
              </div>

              {temas.length === 0 ? (
                <p className="text-sm text-[var(--tenue)]">Sin temas todavía.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {temas.map((tema) => {
                    const esquemas = datos.esquemas.filter((e) => e.temaId === tema.id)
                    const progreso = datos.progresoTema.get(tema.id) ?? PROGRESO_VACIO
                    const estado = estadoPorProgreso(progreso)

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
                            className="mt-0.5 shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{
                              color: COLOR_ESTADO[estado],
                              border: `1px solid ${COLOR_ESTADO[estado]}`,
                            }}
                          >
                            {NOMBRE_ESTADO[estado]}
                          </span>
                        </div>

                        <Barra progreso={progreso} />

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
                                    {datos.progresoEsquema.get(esquema.id)?.dominados ?? 0}/
                                    {datos.progresoEsquema.get(esquema.id)?.total ?? 0}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}

                        <p className="mt-auto text-[11px] text-[var(--tenue)]">
                          {progreso.vistos === 0
                            ? 'Sin empezar a repasar'
                            : `${progreso.dominados} de ${progreso.total} dominados · ${progreso.vistos} vistos`}
                        </p>
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
