import { useEffect, useMemo, useRef, useState } from 'react'
import { usarEsquema } from '../estado/almacenEsquema'
import { BarraLienzo } from '../ui/BarraLienzo'
import { Atajos } from '../ui/Atajos'
import { colocar } from './layout'
import { NodoMental } from './NodoMental'
import { usarViewport } from './usarViewport'

type Props = {
  esquemaId: string
  raizId: string
}

export function Lienzo({ esquemaId, raizId }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [verAtajos, setVerAtajos] = useState(false)
  const [arrastre, setArrastre] = useState<{ id: string; dx: number; dy: number } | null>(null)

  const nodos = usarEsquema((s) => s.nodos)
  const seleccionado = usarEsquema((s) => s.seleccionado)
  const editando = usarEsquema((s) => s.editando)
  const textoVivo = usarEsquema((s) => s.textoVivo)
  const virgen = usarEsquema((s) => s.virgen)

  const mapa = useMemo(
    () =>
      colocar(nodos, raizId, {
        ...(editando ? { enEdicion: { id: editando, texto: textoVivo } } : {}),
        ...(arrastre ? { arrastre } : {}),
      }),
    [nodos, raizId, editando, textoVivo, arrastre],
  )

  const { vista, arrastrando, manejadores, encajar, escalar } = usarViewport(
    contenedor,
    mapa.limites,
  )

  // Encajar una sola vez por esquema: reencajar en cada cambio pelearía con el
  // desplazamiento manual mientras se escribe.
  const encajado = useRef<string | null>(null)
  useEffect(() => {
    if (!mapa.nodos.length || encajado.current === esquemaId) return
    encajado.current = esquemaId
    encajar()
  }, [esquemaId, mapa.nodos.length, encajar])

  // El foco vive en el lienzo para que los atajos funcionen sin tener que
  // pinchar antes en ningún sitio.
  useEffect(() => {
    if (!editando) contenedor.current?.focus()
  }, [esquemaId, editando])

  function alTeclear(e: React.KeyboardEvent<HTMLDivElement>) {
    // Las teclas pulsadas dentro del textarea de un nodo burbujean hasta aquí.
    // Sin esta guarda, cada letra entraba además por el atajo de «empieza a
    // escribir» y reiniciaba el texto a un solo carácter, y Tab o Enter
    // disparaban dos veces la creación de nodos.
    const destino = e.target as HTMLElement | null
    if (destino?.closest?.('textarea, input, select, [contenteditable="true"]')) return

    const acc = usarEsquema.getState()
    const sel = acc.seleccionado
    const meta = e.metaKey || e.ctrlKey

    // Hay una ventana de un fotograma entre crear un nodo y que su textarea
    // coja el foco, porque el foco se pide en un efecto, después del commit.
    // Quien teclee rápido tras Tab cae aquí: en vez de perder la tecla —o
    // peor, que el espacio pliegue la rama— se encamina a mano al nodo.
    if (acc.editando) {
      if (e.key.length === 1 && !meta && !e.altKey) {
        e.preventDefault()
        // La primera tecla reemplaza el texto de partida, igual que si hubiera
        // caído en el textarea ya enfocado (que entra con todo seleccionado).
        // Añadirla sin más dejaba el nodo con los dos textos pegados.
        acc.escribir(acc.virgen ? e.key : acc.textoVivo + e.key)
      }
      return
    }

    if (meta) {
      const tecla = e.key.toLowerCase()
      if (tecla === 'z') {
        e.preventDefault()
        void (e.shiftKey ? acc.rehacer() : acc.deshacer())
        return
      }
      if (e.key === '0') {
        e.preventDefault()
        encajar()
        return
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        escalar(1.2)
        return
      }
      if (e.key === '-') {
        e.preventDefault()
        escalar(1 / 1.2)
        return
      }
      if (sel && e.key === ']') {
        e.preventDefault()
        void acc.meterNivel(sel)
        return
      }
      if (sel && e.key === '[') {
        e.preventDefault()
        void acc.sacarNivel(sel)
        return
      }
      return
    }

    if (e.key === '?') {
      e.preventDefault()
      setVerAtajos((v) => !v)
      return
    }

    if (!sel) return

    switch (e.key) {
      case 'Tab':
        e.preventDefault()
        void (e.shiftKey ? acc.sacarNivel(sel) : acc.crearHijo(sel))
        return
      case 'Enter':
        e.preventDefault()
        void acc.crearHermano(sel)
        return
      case 'ArrowUp':
        e.preventDefault()
        acc.navegar('arriba')
        return
      case 'ArrowDown':
        e.preventDefault()
        acc.navegar('abajo')
        return
      case 'ArrowLeft':
        e.preventDefault()
        acc.navegar('izq')
        return
      case 'ArrowRight':
        e.preventDefault()
        acc.navegar('der')
        return
      case ' ':
        e.preventDefault()
        void acc.alternarPliegue(sel)
        return
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        void acc.borrar(sel)
        return
      case 'F2':
        e.preventDefault()
        acc.empezarEdicion(sel)
        return
      case 'Escape':
        e.preventDefault()
        acc.seleccionar(raizId)
        return
      default:
        break
    }

    // Empezar a teclear reemplaza el texto, como en una hoja de cálculo.
    if (e.key.length === 1 && !e.altKey) {
      e.preventDefault()
      acc.empezarEdicion(sel, e.key)
    }
  }

  async function alTeclearEditando(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const acc = usarEsquema.getState()
    const id = acc.editando
    if (!id) return

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      await acc.terminarEdicion()
      await acc.deshacer()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const vacio = !acc.textoVivo.trim()
      await acc.terminarEdicion()
      // Enter sobre un nodo vacío cierra la cadena en vez de sembrar otro.
      if (!vacio) await acc.crearHermano(id)
      else contenedor.current?.focus()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      await acc.terminarEdicion()
      if (e.shiftKey) await acc.sacarNivel(id)
      else if (usarEsquema.getState().nodos.get(id)) await acc.crearHijo(id)
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      await acc.terminarEdicion()
      contenedor.current?.focus()
    }
  }

  function alPerderFoco(id: string) {
    const acc = usarEsquema.getState()
    // Solo confirma si sigue siendo este nodo el que se editaba: al pasar de un
    // nodo a otro el blur llega después de que el foco ya cambió.
    if (acc.editando === id) void acc.terminarEdicion()
  }

  function alSoltarArrastre() {
    if (!arrastre) return
    // El desplazamiento se confirma como comando al soltar, no en cada
    // fotograma: así deshacer revierte el movimiento entero de una vez.
    void usarEsquema.getState().mover(arrastre.id, arrastre.dx, arrastre.dy)
    setArrastre(null)
  }

  const acciones = usarEsquema.getState()

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={contenedor}
        tabIndex={0}
        role="application"
        aria-label="Lienzo del esquema"
        onKeyDown={alTeclear}
        {...manejadores}
        onDoubleClick={() => encajar()}
        className="relative min-h-0 flex-1 overflow-hidden outline-none"
        style={{
          touchAction: 'none',
          cursor: arrastrando ? 'grabbing' : 'default',
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
          {/* Caja de 1×1 con overflow visible: así no hay que recalcular un
              viewBox cada vez que el mapa cambia de tamaño. */}
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
              editando={editando === colocado.id}
              textoVivo={textoVivo}
              virgen={virgen}
              alSeleccionar={acciones.seleccionar}
              alEditar={acciones.empezarEdicion}
              alAlternarPliegue={(id) => void acciones.alternarPliegue(id)}
              alEscribir={acciones.escribir}
              alPerderFoco={alPerderFoco}
              alTeclearEditando={alTeclearEditando}
              escala={vista.k}
              alArrastrar={(id, dx, dy) => setArrastre({ id, dx, dy })}
              alSoltarArrastre={alSoltarArrastre}
            />
          ))}
        </div>

        {verAtajos && <Atajos alCerrar={() => setVerAtajos(false)} />}
      </div>

      <BarraLienzo
        zoom={vista.k}
        alEncajar={encajar}
        alAcercar={() => escalar(1.2)}
        alAlejar={() => escalar(1 / 1.2)}
        alVerAtajos={() => setVerAtajos((v) => !v)}
      />
    </div>
  )
}
