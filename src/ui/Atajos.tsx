import { Boton } from './Boton'
import { IconoCerrar } from './iconos'

const TECLAS: ReadonlyArray<[string, string]> = [
  ['Tab', 'Crear rama hija'],
  ['Enter', 'Crear nodo al mismo nivel'],
  ['Shift + Tab', 'Sacar el nodo un nivel'],
  ['Cmd/Ctrl + ]', 'Meterlo bajo el hermano anterior'],
  ['↑ ↓ ← →', 'Navegar por el árbol'],
  ['Espacio', 'Plegar o desplegar la rama'],
  ['F2  ·  doble clic', 'Editar el nodo'],
  ['Escribir', 'Reemplaza el texto del nodo'],
  ['Supr', 'Borrar la rama'],
  ['Cmd/Ctrl + Z', 'Deshacer'],
  ['Cmd/Ctrl + Shift + Z', 'Rehacer'],
  ['Cmd/Ctrl + 0', 'Encajar en pantalla'],
  ['?', 'Abrir y cerrar esta lista'],
]

export function Atajos({ alCerrar }: { alCerrar: () => void }) {
  return (
    <div
      className="absolute bottom-4 left-4 z-20 w-[min(22rem,calc(100%-2rem))] rounded-xl border border-[var(--linea)] bg-[var(--lamina)] p-4 shadow-xl"
      role="dialog"
      aria-label="Atajos de teclado"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-titulo text-base font-semibold text-[var(--tinta)]">Atajos</h2>
        <Boton icono variante="fantasma" onClick={alCerrar} aria-label="Cerrar atajos">
          <IconoCerrar tamano={16} />
        </Boton>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        {TECLAS.map(([tecla, que]) => (
          <div key={tecla} className="col-span-2 grid grid-cols-subgrid items-baseline">
            <dt className="whitespace-nowrap font-mono text-[11px] text-[var(--suave)]">{tecla}</dt>
            <dd className="text-[var(--tinta)]">{que}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 border-t border-[var(--linea)] pt-2.5 text-xs leading-relaxed text-[var(--tenue)]">
        En el iPad: dos dedos para desplazar, pinza para el zoom y doble toque en el fondo para
        encajar. Los botones de abajo hacen lo mismo que las teclas.
      </p>
    </div>
  )
}
