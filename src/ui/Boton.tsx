import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'suave' | 'solido' | 'fantasma'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variante?: Variante
  /** Botón de solo icono: cuadrado y con área táctil de 44 px. */
  icono?: boolean
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

export function Boton({ children, variante = 'suave', icono = false, className = '', ...resto }: Props) {
  // 44 px de lado es el mínimo con el que un dedo acierta en el iPad.
  const forma = icono ? 'h-11 w-11 p-0' : 'h-10 px-3.5'
  return (
    <button type="button" className={`${BASE} ${VARIANTES[variante]} ${forma} ${className}`} {...resto}>
      {children}
    </button>
  )
}
