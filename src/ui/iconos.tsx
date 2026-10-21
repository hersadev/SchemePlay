/**
 * Iconos propios en SVG. Sin librería: son nueve trazos y así no entra una
 * dependencia de 300 KB que además habría que cachear en el service worker.
 */
type Props = { tamano?: number }

function Trazo({ children, tamano = 18 }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** Rama nueva colgando del nodo: hijo. */
export const IconoHijo = (p: Props) => (
  <Trazo {...p}>
    <rect x="2" y="9" width="7" height="6" rx="2" />
    <path d="M9 12h5M17 12h5M19.5 9.5v5" />
  </Trazo>
)

/** Caja nueva debajo, al mismo nivel: hermano. */
export const IconoHermano = (p: Props) => (
  <Trazo {...p}>
    <rect x="3" y="3" width="18" height="6" rx="2" />
    <path d="M12 12v9M8 17.5h8" />
  </Trazo>
)

export const IconoPlegar = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 12h16" />
    <path d="M8 8l4-4 4 4M8 16l4 4 4-4" />
  </Trazo>
)

export const IconoPapelera = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </Trazo>
)

export const IconoDeshacer = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 9h11a4.5 4.5 0 0 1 0 9h-6" />
    <path d="M8 5L4 9l4 4" />
  </Trazo>
)

export const IconoRehacer = (p: Props) => (
  <Trazo {...p}>
    <path d="M20 9H9a4.5 4.5 0 0 0 0 9h6" />
    <path d="M16 5l4 4-4 4" />
  </Trazo>
)

export const IconoMas = (p: Props) => (
  <Trazo {...p}>
    <path d="M12 5v14M5 12h14" />
  </Trazo>
)

export const IconoMenos = (p: Props) => (
  <Trazo {...p}>
    <path d="M5 12h14" />
  </Trazo>
)

export const IconoEncajar = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
  </Trazo>
)

export const IconoAyuda = (p: Props) => (
  <Trazo {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.3" />
    <path d="M12 17.2h.01" />
  </Trazo>
)

export const IconoExportar = (p: Props) => (
  <Trazo {...p}>
    <path d="M12 16V4M8 8l4-4 4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Trazo>
)

export const IconoImportar = (p: Props) => (
  <Trazo {...p}>
    <path d="M12 4v12M8 12l4 4 4-4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Trazo>
)

export const IconoBiblioteca = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 5h16M4 12h16M4 19h10" />
  </Trazo>
)

export const IconoCerrar = (p: Props) => (
  <Trazo {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Trazo>
)

export const IconoPanelIzq = (p: Props) => (
  <Trazo {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Trazo>
)

export const IconoPanelDer = (p: Props) => (
  <Trazo {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M15 4v16" />
  </Trazo>
)

export const IconoEstudio = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21z" />
    <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5A2.5 2.5 0 0 1 20 21z" />
  </Trazo>
)

export const IconoReorganizar = (p: Props) => (
  <Trazo {...p}>
    <path d="M4 7h7M4 17h7" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="14" y="14" width="6" height="6" rx="1.5" />
  </Trazo>
)

export const IconoSol = (p: Props) => (
  <Trazo {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Trazo>
)

export const IconoLuna = (p: Props) => (
  <Trazo {...p}>
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
  </Trazo>
)

export const IconoFlecha = (p: Props) => (
  <Trazo {...p}>
    <path d="M9 6l6 6-6 6" />
  </Trazo>
)
