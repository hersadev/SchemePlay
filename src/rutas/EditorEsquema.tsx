import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { renombrarEsquema } from '../datos/biblioteca'
import { db } from '../datos/db'
import { usarEsquema } from '../estado/almacenEsquema'
import { Lienzo } from '../lienzo/Lienzo'
import { Boton } from '../ui/Boton'
import { Inspector } from '../ui/Inspector'
import { IconoCerrar, IconoEstudio, IconoPanelDer, IconoReorganizar } from '../ui/iconos'
import { usarPreferencia } from '../ui/usarPreferencia'

export function EditorEsquema() {
  const { esquemaId = '' } = useParams()
  const [verInspector, setVerInspector] = useState(false)
  const [inspectorAnclado, setInspectorAnclado] = usarPreferencia('inspector', true)
  const [titulo, setTitulo] = useState('')

  const esquema = useLiveQuery(() => db.esquemas.get(esquemaId), [esquemaId])

  const abrir = usarEsquema((s) => s.abrir)
  const cerrar = usarEsquema((s) => s.cerrar)
  const cargando = usarEsquema((s) => s.cargando)
  const abiertoId = usarEsquema((s) => s.esquemaId)

  useEffect(() => {
    if (!esquema || esquema.borrado) return
    void abrir(esquema.id, esquema.nodoRaizId)
    return () => cerrar()
  }, [esquema?.id, esquema?.nodoRaizId, esquema?.borrado, abrir, cerrar])

  useEffect(() => {
    setTitulo(esquema?.titulo ?? '')
  }, [esquema?.id, esquema?.titulo])

  if (esquema === undefined) {
    return <p className="p-6 text-sm text-[var(--tenue)]">Abriendo el esquema…</p>
  }

  if (!esquema || esquema.borrado) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-[var(--suave)]">Este esquema ya no existe.</p>
        <Link to="/" className="text-sm text-[var(--acento)]">
          Volver a la biblioteca
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--linea)] px-3 py-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => void renombrarEsquema(esquema.id, titulo)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Título del esquema"
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 font-titulo text-lg font-semibold text-[var(--tinta)] outline-none hover:border-[var(--linea)] focus:border-[var(--acento)]"
          />
          <Link
            to={`/esquema/${esquema.id}/estudio`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--linea)] bg-[var(--lamina)] px-3 text-xs font-medium text-[var(--tinta)] hover:bg-[var(--hundido)]"
          >
            <IconoEstudio tamano={15} />
            Estudiar
          </Link>

          <Boton
            tamano="pequeno"
            className="shrink-0"
            onClick={() => void usarEsquema.getState().reorganizar()}
            title="Devolver los nodos movidos a su sitio automático"
          >
            <IconoReorganizar tamano={15} />
            Reorganizar
          </Boton>

          <Boton
            icono
            variante="fantasma"
            tamano="pequeno"
            className="hidden shrink-0 lg:inline-flex"
            onClick={() => setInspectorAnclado((v) => !v)}
            title={inspectorAnclado ? 'Ocultar el detalle' : 'Mostrar el detalle'}
            aria-label={inspectorAnclado ? 'Ocultar el detalle' : 'Mostrar el detalle'}
            aria-pressed={inspectorAnclado}
          >
            <IconoPanelDer tamano={16} />
          </Boton>

          <Boton
            tamano="pequeno"
            className="shrink-0 lg:hidden"
            onClick={() => setVerInspector((v) => !v)}
          >
            {verInspector ? 'Ocultar notas' : 'Notas'}
          </Boton>
        </div>

        {cargando || abiertoId !== esquema.id ? (
          <p className="p-6 text-sm text-[var(--tenue)]">Cargando los nodos…</p>
        ) : (
          <Lienzo esquemaId={esquema.id} raizId={esquema.nodoRaizId} />
        )}
      </div>

      {/* En pantalla ancha el inspector es una columna fija; en el iPad en
          vertical y en el móvil se superpone, para no robarle sitio al mapa. */}
      {inspectorAnclado && (
        <aside className="hidden w-72 shrink-0 border-l border-[var(--linea)] bg-[var(--lamina)] lg:block">
          <Inspector />
        </aside>
      )}

      {verInspector && (
        <aside className="absolute inset-x-0 bottom-0 top-auto z-30 max-h-[70%] border-t border-[var(--linea)] bg-[var(--lamina)] shadow-2xl lg:hidden">
          <div className="flex items-center justify-between border-b border-[var(--linea)] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
              Detalle del nodo
            </span>
            <Boton
              icono
              variante="fantasma"
              onClick={() => setVerInspector(false)}
              aria-label="Cerrar el detalle"
            >
              <IconoCerrar tamano={16} />
            </Boton>
          </div>
          <div className="max-h-[calc(70vh-3rem)] overflow-y-auto">
            <Inspector />
          </div>
        </aside>
      )}
    </div>
  )
}
