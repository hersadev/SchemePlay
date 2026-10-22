import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db, vivas } from '../datos/db'
import type { Esquema, Nodo, Tema } from '../datos/tipos'
import { CALIDADES, type Calidad, enCuantosDias, programar, toca } from '../estudio/sm2'
import { Boton } from '../ui/Boton'

/**
 * Cola de repaso: todo lo que toca hoy, mezclando temas y bloques.
 *
 * Es la contrapartida del modo estudio, que va esquema a esquema. Aquí lo que
 * manda es la fecha: si un nodo del Tema 3 y otro del Tema 9 vencen hoy, salen
 * los dos seguidos, que es justo lo que hace que el repaso espaciado funcione.
 */
type Ficha = {
  nodo: Nodo
  esquema: Esquema
  tema: Tema | undefined
  /** Del padre a la raíz, para situar el nodo sin enseñar la respuesta. */
  camino: string[]
}

export function ColaRepaso() {
  const [revelado, setRevelado] = useState(false)
  /**
   * Nodos ya valorados en esta sesión. La cola es una consulta en vivo y el
   * nodo valorado sale de ella solo, así que avanzar además un índice saltaba
   * la tarjeta siguiente. Filtrar por id no depende de cuándo llegue esa
   * relectura, y evita que la misma tarjeta asome un instante y se valore dos
   * veces.
   */
  const [hechos, setHechos] = useState<ReadonlySet<string>>(new Set())

  const vencidos = useLiveQuery<Ficha[]>(async () => {
    const ahora = Date.now()
    const [nodos, esquemas, temas] = await Promise.all([
      db.nodos.toArray(),
      db.esquemas.toArray(),
      db.temas.toArray(),
    ])

    const porEsquema = new Map(vivas(esquemas).map((e) => [e.id, e]))
    const porTema = new Map(vivas(temas).map((t) => [t.id, t]))
    const porId = new Map(nodos.map((n) => [n.id, n]))

    const vencidos = vivas(nodos).filter((n) => n.padreId !== null && toca(n.repasarEn, ahora))

    // Lo más atrasado primero: es lo que más cerca está de olvidarse.
    vencidos.sort((a, b) => (a.repasarEn ?? 0) - (b.repasarEn ?? 0))

    return vencidos.flatMap((nodo) => {
      const esquema = porEsquema.get(nodo.esquemaId)
      if (!esquema) return []

      const camino: string[] = []
      let padre = nodo.padreId ? porId.get(nodo.padreId) : undefined
      while (padre && camino.length < 4) {
        camino.unshift(padre.texto)
        padre = padre.padreId ? porId.get(padre.padreId) : undefined
      }

      return [{ nodo, esquema, tema: porTema.get(esquema.temaId), camino }]
    })
  }, [])

  if (!vencidos) return <p className="p-6 text-sm text-[var(--tenue)]">Mirando qué toca hoy…</p>

  const cola = vencidos.filter((f) => !hechos.has(f.nodo.id))

  if (cola.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="font-titulo text-3xl font-semibold text-[var(--tinta)]">
          {hechos.size > 0 ? 'Repaso terminado' : 'Hoy no toca nada'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--suave)]">
          {hechos.size > 0
            ? `Has repasado ${hechos.size} ${hechos.size === 1 ? 'nodo' : 'nodos'}. Vuelve mañana.`
            : 'La cola se llena sola a medida que valoras nodos en el modo estudio de cada esquema.'}
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-[var(--acento)]">
          ← Volver a los esquemas
        </Link>
      </div>
    )
  }

  const ficha = cola[0]!

  async function valorar(calidad: Calidad) {
    const siguiente = programar(ficha.nodo, calidad)
    // Se marca antes de esperar a la escritura: un doble toque mientras tanto
    // ya no encuentra la tarjeta.
    setHechos((h) => new Set(h).add(ficha.nodo.id))
    setRevelado(false)
    await db.nodos.put({
      ...ficha.nodo,
      confianza: calidad,
      ...siguiente,
      // Subir la version es lo que hace que este repaso viaje al otro
      // dispositivo en vez de perderse en la siguiente fusión.
      version: ficha.nodo.version + 1,
      actualizadoEn: Date.now(),
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-5">
      <header className="flex items-baseline justify-between gap-3">
        <Link to="/" className="text-sm text-[var(--acento)]">
          ← Salir
        </Link>
        <span className="font-mono text-xs text-[var(--tenue)] tabular-nums">
          quedan {cola.length} · hechos {hechos.size}
        </span>
      </header>

      <div className="flex min-h-[18rem] flex-col gap-4 rounded-xl border border-[var(--linea)] bg-[var(--lamina)] p-5">
        <div className="text-xs text-[var(--tenue)]">
          {ficha.tema?.numero ? `${ficha.tema.numero} · ` : ''}
          {ficha.tema?.nombre ?? ficha.esquema.titulo}
        </div>

        <nav aria-label="Dónde está el nodo" className="flex flex-wrap items-center gap-1.5">
          {ficha.camino.map((paso, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--tenue)]">›</span>}
              <span className="text-sm text-[var(--suave)]">{paso}</span>
            </span>
          ))}
        </nav>

        <div className="flex min-h-[6rem] flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--linea)] p-4">
          {revelado ? (
            <p className="text-center font-titulo text-2xl leading-snug text-[var(--tinta)]">
              {ficha.nodo.texto}
            </p>
          ) : (
            <Boton variante="solido" onClick={() => setRevelado(true)}>
              Mostrar la respuesta
            </Boton>
          )}
        </div>

        {revelado && ficha.nodo.notas && (
          <p className="whitespace-pre-wrap rounded-lg bg-[var(--hundido)] p-3 text-[13px] leading-relaxed text-[var(--suave)]">
            {ficha.nodo.notas}
          </p>
        )}

        {revelado && (
          <div className="flex flex-wrap gap-2">
            {CALIDADES.map((c) => (
              <Boton
                key={c.valor}
                variante={c.valor === 5 ? 'solido' : 'suave'}
                className="flex-1"
                onClick={() => void valorar(c.valor)}
                title={c.pista}
              >
                {c.etiqueta}
                <span className="font-mono text-[11px] opacity-70">
                  {programar(ficha.nodo, c.valor).intervalo}d
                </span>
              </Boton>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--tenue)]">
        {ficha.nodo.repasarEn
          ? `Tocaba hace ${Math.abs(enCuantosDias(ficha.nodo.repasarEn))} días.`
          : ''}{' '}
        <Link to={`/esquema/${ficha.esquema.id}`} className="text-[var(--acento)]">
          Ver el esquema entero
        </Link>
      </p>
    </div>
  )
}
