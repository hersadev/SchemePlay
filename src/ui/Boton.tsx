import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'suave' | 'solido' | 'fantasma'
type Tamano = 'normal' | 'pequeno'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variante?: Variante
  /** Botón de solo icono: cuadrado, sin padding horizontal. */
  icono?: boolean
  tamano?: Tamano
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

const VARIANTES: Record<Variante, string> = {
  suave:
    'border-[var(--linea)] bg-[var(--lamina)] text-[var(--tinta)] hover:bg-[var(--hundido)]',
  solido:
    'border-transparent bg-[var(--acento)] text-white hover:brightness-110',
  fantasma:
    'border-transparent bg-transparent text-[var(--suave)] hover:bg-[var(--hundido)] hover:text-[var(--tinta)]',
}

/*
 * El tamaño es una prop y no una clase que se pase desde fuera. Pasarla por
 * `className` no funciona: ante `px-3.5` y `p-0`, Tailwind no resuelve por el
 * orden del atributo sino por el orden en que emite el CSS, y gana `px-3.5`.
 * Así es como los botones de la biblioteca acabaron con 4 px de hueco y el
 * icono aplastado a 2 px de ancho, invisible en la práctica.
 */
const FORMAS: Record<Tamano, { icono: string; texto: string }> = {
  // 44 px de lado es el mínimo con el que un dedo acierta en el iPad.
  normal: { icono: 'h-11 w-11 p-0', texto: 'h-10 px-3.5' },
  pequeno: { icono: 'h-8 w-8 p-0', texto: 'h-8 px-2.5 text-xs' },
}

export function Boton({
  children,
  variante = 'suave',
  icono = false,
  tamano = 'normal',
  className = '',
  ...resto
}: Props) {
  const forma = FORMAS[tamano][icono ? 'icono' : 'texto']
  return (
    <button type="button" className={`${BASE} ${VARIANTES[variante]} ${forma} ${className}`} {...resto}>
      {children}
    </button>
  )
}
