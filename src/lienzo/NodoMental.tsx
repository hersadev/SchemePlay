import { useEffect, useRef } from 'react'
import { estiloDe, FAMILIA } from './estilo'
import type { Colocado } from './layout'

/** Mezcla un hex de 6 dígitos con transparencia, sin salirse de la paleta. */
function conAlfa(hex: string, alfa: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alfa})`
}

type Props = {
  colocado: Colocado
  seleccionado: boolean
  editando: boolean
  textoVivo: string
  /** Cierto si el texto de partida sigue intacto: entonces se selecciona todo. */
  virgen: boolean
  alSeleccionar: (id: string) => void
  alEditar: (id: string) => void
  alAlternarPliegue: (id: string) => void
  alEscribir: (texto: string) => void
  alPerderFoco: (id: string) => void
  alTeclearEditando: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  /** Escala del lienzo: convierte píxeles de pantalla en unidades del mapa. */
  escala: number
  alArrastrar: (id: string, dx: number, dy: number) => void
  alSoltarArrastre: () => void
}

export function NodoMental({
  colocado,
  seleccionado,
  editando,
  textoVivo,
  virgen,
  alSeleccionar,
  alEditar,
  alAlternarPliegue,
  alEscribir,
  alPerderFoco,
  alTeclearEditando,
  escala,
  alArrastrar,
  alSoltarArrastre,
}: Props) {
  const estilo = estiloDe(colocado.profundidad)
  const esRaiz = colocado.profundidad === 0
  const campo = useRef<HTMLTextAreaElement>(null)

  // `virgen` se lee por referencia a propósito: si estuviera en las
  // dependencias, el efecto volvería a correr al teclear la primera letra y
  // lanzaría el cursor al final: pinchar en medio de un nodo y escribir
  // saltaba al final tras el primer carácter.
  const virgenRef = useRef(virgen)
  virgenRef.current = virgen

  useEffect(() => {
    if (!editando) return
    const el = campo.current
    if (!el) return
    el.focus()
    // Al entrar a editar se selecciona todo, como en SimpleMind: la primera
    // tecla reemplaza y con End o una flecha se añade al final. Si ya se
    // tecleó algo antes de que llegara el foco, el cursor va al final para no
    // comerse lo escrito.
    if (virgenRef.current) el.select()
    else el.setSelectionRange(el.value.length, el.value.length)
  }, [editando])

  // El umbral evita que un pulsar-y-soltar con un temblor de dos píxeles
  // cuente como movimiento y ensucie la pila de deshacer.
  const UMBRAL = 4
  const arrastre = useRef<{ x: number; y: number; movido: boolean } | null>(null)

  function bajar(e: React.PointerEvent<HTMLDivElement>) {
    alSeleccionar(colocado.id)
    if (editando) return
    e.currentTarget.setPointerCapture(e.pointerId)
    arrastre.current = { x: e.clientX, y: e.clientY, movido: false }
  }

  function mover(e: React.PointerEvent<HTMLDivElement>) {
    const a = arrastre.current
    if (!a) return
    const dxPantalla = e.clientX - a.x
    const dyPantalla = e.clientY - a.y
    if (!a.movido && Math.hypot(dxPantalla, dyPantalla) < UMBRAL) return
    a.movido = true
    alArrastrar(colocado.id, dxPantalla / escala, dyPantalla / escala)
  }

  function soltar() {
    const a = arrastre.current
    arrastre.current = null
    if (a?.movido) alSoltarArrastre()
  }

  const colorBorde = esRaiz ? 'transparent' : colocado.color
  const grosorBorde = esRaiz ? 0 : colocado.profundidad === 1 ? 2 : 1

  return (
    <div
      data-nodo={colocado.id}
      onPointerDown={bajar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onDoubleClick={(e) => {
        e.stopPropagation()
        alEditar(colocado.id)
      }}
      style={{
        position: 'absolute',
        left: colocado.x,
        top: colocado.y,
        width: colocado.ancho,
        height: colocado.alto,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${estilo.padY}px ${estilo.padX}px`,
        borderRadius: estilo.radio,
        border: esRaiz ? 'none' : `${grosorBorde}px solid ${colorBorde}`,
        background: esRaiz
          ? 'var(--tinta)'
          : colocado.profundidad === 1
            ? conAlfa(colocado.color, 0.1)
            : 'var(--lamina)',
        color: esRaiz ? 'var(--fondo)' : 'var(--tinta)',
        fontFamily: FAMILIA,
        fontSize: estilo.tamano,
        fontWeight: estilo.peso,
        lineHeight: `${estilo.altoLinea}px`,
        textAlign: 'center',
        cursor: editando ? 'text' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        outline: seleccionado ? '2px solid var(--acento)' : 'none',
        outlineOffset: 2,
        boxShadow: seleccionado ? '0 2px 10px rgba(0,0,0,0.12)' : 'none',
      }}
    >
      {editando ? (
        <textarea
          ref={campo}
          value={textoVivo}
          onChange={(e) => alEscribir(e.target.value)}
          onKeyDown={alTeclearEditando}
          onBlur={() => alPerderFoco(colocado.id)}
          onPointerDown={(e) => e.stopPropagation()}
          rows={colocado.lineas.length}
          spellCheck={false}
          aria-label="Texto del nodo"
          style={{
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
            border: 'none',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            lineHeight: 'inherit',
            textAlign: 'center',
            caretColor: esRaiz ? 'var(--fondo)' : 'var(--acento)',
          }}
        />
      ) : (
        <span style={{ pointerEvents: 'none' }}>
          {colocado.lineas.map((linea, i) => (
            <span key={i} style={{ display: 'block' }}>
              {linea || '\u00A0'}
              {i < colocado.lineas.length - 1 ? ' ' : ''}
            </span>
          ))}
        </span>
      )}

      {colocado.hijos > 0 && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            alAlternarPliegue(colocado.id)
          }}
          title={colocado.colapsado ? `Desplegar ${colocado.ocultos} nodos` : 'Plegar rama'}
          aria-label={colocado.colapsado ? `Desplegar ${colocado.ocultos} nodos` : 'Plegar rama'}
          style={{
            position: 'absolute',
            top: '50%',
            [colocado.lado === 'der' ? 'right' : 'left']: -11,
            transform: 'translateY(-50%)',
            minWidth: 20,
            height: 20,
            padding: colocado.colapsado ? '0 5px' : 0,
            borderRadius: 10,
            border: `1px solid ${esRaiz ? 'var(--tinta)' : colocado.color}`,
            background: 'var(--lamina)',
            color: esRaiz ? 'var(--tinta)' : colocado.color,
            fontFamily: FAMILIA,
            fontSize: 11,
            fontWeight: 650,
            lineHeight: '18px',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {colocado.colapsado ? colocado.ocultos : '−'}
        </button>
      )}
    </div>
  )
}
