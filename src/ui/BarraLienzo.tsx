import { usarEsquema } from '../estado/almacenEsquema'
import { Boton } from './Boton'
import {
  IconoAyuda,
  IconoDeshacer,
  IconoEncajar,
  IconoHermano,
  IconoHijo,
  IconoMas,
  IconoMenos,
  IconoPapelera,
  IconoPlegar,
  IconoRehacer,
} from './iconos'

type Props = {
  zoom: number
  alEncajar: () => void
  alAcercar: () => void
  alAlejar: () => void
  alVerAtajos: () => void
}

/**
 * Barra del lienzo. En el Mac y en Windows sobra con el teclado, pero en el
 * iPad es la única forma de crear nodos: por eso cada acción de teclado
 * importante tiene aquí su botón, y no solo las de zoom.
 */
export function BarraLienzo({ zoom, alEncajar, alAcercar, alAlejar, alVerAtajos }: Props) {
  const seleccionado = usarEsquema((s) => s.seleccionado)
  const nodos = usarEsquema((s) => s.nodos)
  const pila = usarEsquema((s) => s.pila)
  const puntero = usarEsquema((s) => s.puntero)

  const acc = usarEsquema.getState()
  const nodo = seleccionado ? nodos.get(seleccionado) : undefined
  const esRaiz = nodo?.padreId === null
  const tieneHijos = seleccionado
    ? [...nodos.values()].some((n) => !n.borrado && n.padreId === seleccionado)
    : false

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-[var(--linea)] bg-[var(--lamina)] px-2 py-1.5">
      <Boton
        icono
        disabled={!nodo}
        onClick={() => seleccionado && void acc.crearHijo(seleccionado)}
        title="Nueva rama hija (Tab)"
        aria-label="Nueva rama hija"
      >
        <IconoHijo />
      </Boton>

      <Boton
        icono
        disabled={!nodo}
        onClick={() => seleccionado && void acc.crearHermano(seleccionado)}
        title="Nuevo nodo al mismo nivel (Enter)"
        aria-label="Nuevo nodo al mismo nivel"
      >
        <IconoHermano />
      </Boton>

      <Boton
        icono
        disabled={!tieneHijos}
        onClick={() => seleccionado && void acc.alternarPliegue(seleccionado)}
        title="Plegar o desplegar la rama (Espacio)"
        aria-label="Plegar o desplegar la rama"
      >
        <IconoPlegar />
      </Boton>

      <Boton
        icono
        disabled={!nodo || esRaiz}
        onClick={() => seleccionado && void acc.borrar(seleccionado)}
        title="Borrar la rama (Supr)"
        aria-label="Borrar la rama"
      >
        <IconoPapelera />
      </Boton>

      <span className="mx-1 h-6 w-px bg-[var(--linea)]" aria-hidden="true" />

      <Boton
        icono
        disabled={puntero === 0}
        onClick={() => void acc.deshacer()}
        title="Deshacer (Cmd/Ctrl+Z)"
        aria-label="Deshacer"
      >
        <IconoDeshacer />
      </Boton>

      <Boton
        icono
        disabled={puntero >= pila.length}
        onClick={() => void acc.rehacer()}
        title="Rehacer (Cmd/Ctrl+Shift+Z)"
        aria-label="Rehacer"
      >
        <IconoRehacer />
      </Boton>

      <div className="ml-auto flex items-center gap-1.5">
        <Boton icono onClick={alAlejar} title="Alejar (Cmd/Ctrl+−)" aria-label="Alejar">
          <IconoMenos />
        </Boton>

        <span
          className="w-12 text-center font-mono text-xs text-[var(--suave)] tabular-nums"
          aria-label={`Zoom al ${Math.round(zoom * 100)} por ciento`}
        >
          {Math.round(zoom * 100)}%
        </span>

        <Boton icono onClick={alAcercar} title="Acercar (Cmd/Ctrl++)" aria-label="Acercar">
          <IconoMas />
        </Boton>

        <Boton
          icono
          onClick={alEncajar}
          title="Encajar en pantalla (Cmd/Ctrl+0 o doble clic)"
          aria-label="Encajar en pantalla"
        >
          <IconoEncajar />
        </Boton>

        <Boton icono variante="fantasma" onClick={alVerAtajos} title="Atajos (?)" aria-label="Ver atajos">
          <IconoAyuda />
        </Boton>
      </div>
    </div>
  )
}
