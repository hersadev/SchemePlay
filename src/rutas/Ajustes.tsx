import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, escribirAjuste, leerAjuste, pedirAlmacenPersistente } from '../datos/db'
import { ErrorFichero, descargar, exportarTodo, leerDeDisco } from '../datos/fichero'
import { fusionar, previsualizar, type Previsualizacion } from '../datos/fusion'
import { idDispositivo, renombrarDispositivo } from '../datos/ids'
import { listarInstantaneas, restaurarInstantanea, tomarInstantanea } from '../datos/instantaneas'
import type { FicheroTrasvase } from '../datos/tipos'
import { Boton } from '../ui/Boton'
import { IconoExportar, IconoImportar } from '../ui/iconos'

const DIA = 86_400_000

function fecha(ms: number): string {
  return new Date(ms).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

type Fase =
  | { tipo: 'inicio' }
  | { tipo: 'revisando'; fichero: FicheroTrasvase; resumen: Previsualizacion }
  | { tipo: 'aplicando' }
  | { tipo: 'hecho'; resumen: Previsualizacion }
  | { tipo: 'error'; mensaje: string }

export function Ajustes() {
  const [fase, setFase] = useState<Fase>({ tipo: 'inicio' })
  const [dispositivo, setDispositivo] = useState(idDispositivo())
  const selector = useRef<HTMLInputElement>(null)

  const estado = useLiveQuery(async () => {
    const [bloques, temas, esquemas, nodos, instantaneas, ultima] = await Promise.all([
      db.bloques.count(),
      db.temas.count(),
      db.esquemas.count(),
      db.nodos.count(),
      listarInstantaneas(),
      leerAjuste<number | null>('ultimaExportacion', null),
    ])
    const persistente = Boolean(await navigator.storage?.persisted?.())
    return { bloques, temas, esquemas, nodos, instantaneas, ultima, persistente }
  }, [])

  async function exportar() {
    const fichero = await exportarTodo()
    descargar(fichero)
    await escribirAjuste('ultimaExportacion', fichero.exportadoEn)
  }

  async function elegirFichero(archivo: File | undefined) {
    if (!archivo) return
    try {
      const fichero = await leerDeDisco(archivo)
      const resumen = await previsualizar(fichero)
      setFase({ tipo: 'revisando', fichero, resumen })
    } catch (e) {
      setFase({
        tipo: 'error',
        mensaje: e instanceof ErrorFichero ? e.message : 'No se pudo leer el fichero.',
      })
    }
  }

  async function aplicar(fichero: FicheroTrasvase) {
    setFase({ tipo: 'aplicando' })
    try {
      // La instantánea va FUERA de la transacción de fusión: si formara parte
      // de ella, se revertiría junto con lo que pretende poder revertir.
      await tomarInstantanea(`antes de importar ${fichero.dispositivo}`)
      const resumen = await fusionar(fichero)
      setFase({ tipo: 'hecho', resumen })
    } catch (e) {
      setFase({
        tipo: 'error',
        mensaje: e instanceof Error ? e.message : 'La importación falló a medias.',
      })
    }
  }

  const diasSinExportar =
    estado?.ultima != null ? Math.floor((Date.now() - estado.ultima) / DIA) : null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-5 pb-16">
      <header>
        <Link to="/" className="text-sm text-[var(--acento)]">
          ← Volver a los esquemas
        </Link>
        <h1 className="mt-2 font-titulo text-3xl font-semibold text-[var(--tinta)]">
          Ajustes y trasvase
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--suave)]">
          Tus esquemas viven en este dispositivo y no salen de aquí. Para llevarlos a otro,
          exporta el fichero, pásalo por donde quieras —Drive, AirDrop, un cable— e impórtalo
          allí.
        </p>
      </header>

      {(estado?.ultima == null || (diasSinExportar ?? 0) >= 7) && (
        <p className="rounded-lg border border-[var(--estudio)] bg-[var(--estudio-suave)] p-3.5 text-sm leading-relaxed text-[var(--tinta)]">
          <strong>Sin servidor, la copia de seguridad la haces tú.</strong>{' '}
          {estado?.ultima == null
            ? 'Todavía no has exportado nunca: si pierdes este dispositivo, pierdes el temario.'
            : `Hace ${diasSinExportar} días que no exportas.`}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
          Exportar
        </h2>
        <Boton variante="solido" className="self-start" onClick={() => void exportar()}>
          <IconoExportar tamano={16} />
          Exportar todo a un fichero
        </Boton>
        {estado && (
          <p className="font-mono text-xs text-[var(--tenue)]">
            {estado.bloques} bloques · {estado.temas} temas · {estado.esquemas} esquemas ·{' '}
            {estado.nodos} nodos
            {estado.ultima != null && ` · última exportación: ${fecha(estado.ultima)}`}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
          Importar
        </h2>

        <input
          ref={selector}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void elegirFichero(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        {fase.tipo === 'inicio' && (
          <>
            <Boton className="self-start" onClick={() => selector.current?.click()}>
              <IconoImportar tamano={16} />
              Elegir un fichero
            </Boton>
            <p className="text-xs leading-relaxed text-[var(--tenue)]">
              Importar <strong>fusiona</strong>, no sustituye: cada fila se compara con la local
              y gana la más nueva. Antes de aplicar nada verás qué va a cambiar.
            </p>
          </>
        )}

        {fase.tipo === 'revisando' && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--linea)] bg-[var(--lamina)] p-4">
            <p className="text-sm text-[var(--suave)]">
              Fichero de <strong className="text-[var(--tinta)]">{fase.fichero.dispositivo}</strong>,
              exportado el {fecha(fase.fichero.exportadoEn)}.
            </p>

            <dl className="grid grid-cols-3 gap-3 border-y border-[var(--linea)] py-3">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-[var(--tenue)]">Se añaden</dt>
                <dd className="font-mono text-xl text-[var(--tinta)] tabular-nums">
                  {fase.resumen.total.insertados}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-[var(--tenue)]">
                  Se actualizan
                </dt>
                <dd className="font-mono text-xl text-[var(--tinta)] tabular-nums">
                  {fase.resumen.total.actualizados}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-[var(--tenue)]">
                  Se ignoran
                </dt>
                <dd className="font-mono text-xl text-[var(--tenue)] tabular-nums">
                  {fase.resumen.total.ignorados}
                </dd>
              </div>
            </dl>

            {fase.resumen.bajas > 0 && (
              <p className="text-sm text-[var(--tinta)]">
                {fase.resumen.bajas}{' '}
                {fase.resumen.bajas === 1 ? 'fila se dará de baja' : 'filas se darán de baja'}{' '}
                porque el otro dispositivo las borró.
              </p>
            )}

            {fase.resumen.conflictos.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--estudio)]">
                  {fase.resumen.conflictos.length} en conflicto
                </summary>
                <ul className="mt-2 flex flex-col gap-1 border-l-2 border-[var(--estudio)] pl-3">
                  {fase.resumen.conflictos.slice(0, 12).map((c) => (
                    <li key={`${c.tabla}-${c.id}`} className="text-[13px] text-[var(--suave)]">
                      <span className="text-[var(--tinta)]">{c.etiqueta}</span> — gana{' '}
                      {c.gana === 'entrante' ? 'la versión del fichero' : 'la de este dispositivo'}
                    </li>
                  ))}
                  {fase.resumen.conflictos.length > 12 && (
                    <li className="text-xs text-[var(--tenue)]">
                      y {fase.resumen.conflictos.length - 12} más
                    </li>
                  )}
                </ul>
              </details>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Boton variante="solido" onClick={() => void aplicar(fase.fichero)}>
                Fusionar
              </Boton>
              <Boton onClick={() => setFase({ tipo: 'inicio' })}>Cancelar</Boton>
            </div>
            <p className="text-xs text-[var(--tenue)]">
              Se guarda una instantánea antes de aplicar, por si hay que volver atrás.
            </p>
          </div>
        )}

        {fase.tipo === 'aplicando' && <p className="text-sm text-[var(--suave)]">Fusionando…</p>}

        {fase.tipo === 'hecho' && (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--bien)] p-4">
            <p className="text-sm text-[var(--tinta)]">
              Listo: {fase.resumen.total.insertados} añadidos y{' '}
              {fase.resumen.total.actualizados} actualizados.
            </p>
            <Boton onClick={() => setFase({ tipo: 'inicio' })}>Importar otro</Boton>
          </div>
        )}

        {fase.tipo === 'error' && (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--mal)] p-4">
            <p className="text-sm text-[var(--tinta)]">{fase.mensaje}</p>
            <Boton onClick={() => setFase({ tipo: 'inicio' })}>Volver a intentarlo</Boton>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
          Instantáneas
        </h2>
        {estado?.instantaneas.length ? (
          <ul className="flex flex-col divide-y divide-[var(--linea)] rounded-lg border border-[var(--linea)]">
            {estado.instantaneas.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-[var(--tinta)]">{i.motivo}</p>
                  <p className="font-mono text-[11px] text-[var(--tenue)]">{fecha(i.tomadaEn)}</p>
                </div>
                <Boton
                  className="h-9 px-3 text-xs"
                  onClick={() => {
                    if (confirm('Esto deja la base como estaba en ese momento. ¿Seguro?')) {
                      void restaurarInstantanea(i.id)
                    }
                  }}
                >
                  Restaurar
                </Boton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--tenue)]">
            Aún no hay ninguna. Se toma una automáticamente antes de cada importación.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
          Este dispositivo
        </h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--suave)]">
            Nombre, para reconocerlo en los ficheros que exporte
          </span>
          <input
            value={dispositivo}
            onChange={(e) => setDispositivo(e.target.value)}
            onBlur={() => {
              renombrarDispositivo(dispositivo)
              setDispositivo(idDispositivo())
            }}
            className="max-w-xs rounded-lg border border-[var(--linea)] bg-[var(--lamina)] px-2.5 py-2 font-mono text-[13px] text-[var(--tinta)] outline-none focus:border-[var(--acento)]"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--suave)]">
            Almacenamiento persistente:{' '}
            <strong className="text-[var(--tinta)]">
              {estado?.persistente ? 'concedido' : 'no concedido'}
            </strong>
          </span>
          {!estado?.persistente && (
            <Boton className="h-9 px-3 text-xs" onClick={() => void pedirAlmacenPersistente()}>
              Pedirlo
            </Boton>
          )}
        </div>
        <p className="text-xs leading-relaxed text-[var(--tenue)]">
          Safari en iOS desaloja la base de datos de los sitios que considera poco usados. Con el
          permiso concedido deja de hacerlo, pero la copia de seguridad de verdad es el fichero
          exportado.
        </p>
      </section>
    </div>
  )
}
