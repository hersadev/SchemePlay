import { useEffect, useState } from 'react'
import { usarEsquema } from '../estado/almacenEsquema'
import { PALETA_RAMAS } from '../lienzo/estilo'
import { Boton } from './Boton'

/**
 * Detalle del nodo seleccionado. El texto corto se edita en el propio nodo del
 * lienzo; aquí va lo que no cabe ahí: las notas largas, el color de la rama y
 * en qué lado del mapa cae.
 */
export function Inspector() {
  const seleccionado = usarEsquema((s) => s.seleccionado)
  const nodos = usarEsquema((s) => s.nodos)
  const raizId = usarEsquema((s) => s.raizId)

  const nodo = seleccionado ? nodos.get(seleccionado) : undefined
  const [notas, setNotas] = useState('')

  // Al cambiar de nodo, el campo de notas se recarga con las suyas.
  useEffect(() => {
    setNotas(nodo?.notas ?? '')
  }, [nodo?.id, nodo?.notas])

  if (!nodo) {
    return (
      <p className="p-4 text-sm leading-relaxed text-[var(--tenue)]">
        Selecciona un nodo del esquema para ver sus notas y su color.
      </p>
    )
  }

  const acc = usarEsquema.getState()
  const esHijoDeRaiz = nodo.padreId === raizId
  const esRaiz = nodo.padreId === null

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-4">
      <section>
        <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
          Nodo
        </h2>
        <p className="font-titulo text-[17px] leading-snug text-[var(--tinta)]">
          {nodo.texto || <span className="text-[var(--tenue)]">(sin texto)</span>}
        </p>
        <Boton
          variante="fantasma"
          className="mt-1.5 h-8 px-2 text-xs"
          onClick={() => acc.empezarEdicion(nodo.id)}
        >
          Editar el texto
        </Boton>
      </section>

      <section>
        <label
          htmlFor="notas-nodo"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]"
        >
          Notas
        </label>
        <textarea
          id="notas-nodo"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => void acc.cambiarNotas(nodo.id, notas)}
          rows={7}
          placeholder="El desarrollo largo, la literalidad del artículo, el ejemplo que no te cabe en el nodo…"
          className="w-full resize-y rounded-lg border border-[var(--linea)] bg-[var(--lamina)] p-2.5 text-[13px] leading-relaxed text-[var(--tinta)] outline-none focus:border-[var(--acento)]"
        />
        <p className="mt-1 text-[11px] text-[var(--tenue)]">Se guarda al salir del campo.</p>
      </section>

      {!esRaiz && (
        <section>
          <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
            Color de la rama
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {PALETA_RAMAS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => void acc.cambiarColor(nodo.id, color)}
                aria-label={`Usar el color ${color}`}
                aria-pressed={nodo.color === color}
                className="h-7 w-7 rounded-md border-2 transition-transform hover:scale-110"
                style={{
                  background: color,
                  borderColor: nodo.color === color ? 'var(--tinta)' : 'transparent',
                }}
              />
            ))}
            <Boton
              variante="fantasma"
              className="h-7 px-2 text-xs"
              disabled={!nodo.color}
              onClick={() => void acc.cambiarColor(nodo.id, undefined)}
            >
              Heredar
            </Boton>
          </div>
        </section>
      )}

      {esHijoDeRaiz && (
        <section>
          <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
            Lado del mapa
          </h2>
          <div className="flex gap-1.5">
            <Boton
              variante={nodo.lado === 'izq' ? 'solido' : 'suave'}
              className="flex-1"
              onClick={() => void acc.cambiarLado(nodo.id, 'izq')}
            >
              Izquierda
            </Boton>
            <Boton
              variante={nodo.lado !== 'izq' ? 'solido' : 'suave'}
              className="flex-1"
              onClick={() => void acc.cambiarLado(nodo.id, 'der')}
            >
              Derecha
            </Boton>
          </div>
        </section>
      )}
    </div>
  )
}
