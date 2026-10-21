/**
 * Modelo de datos. Las cuatro tablas comparten `Fusionable`: sin esos tres
 * campos, importar un fichero de otro dispositivo solo podría SUSTITUIR la base
 * local, y cada trasvase se comería el trabajo hecho mientras tanto.
 */

export type Fusionable = {
  /** Sube en cada edición local. Manda sobre la fecha al fusionar. */
  version: number
  /** Solo se usa para deshacer empates de `version`. */
  actualizadoEn: number
  /** Tombstone. Nunca se borra una fila de verdad: así la baja se propaga. */
  borrado?: boolean
}

export type Bloque = Fusionable & {
  id: string
  nombre: string
  /** Color base que heredan las ramas de sus esquemas. */
  color: string
  /** Índice fraccionario: "a0", "a0V", "a1". */
  orden: string
}

export type EstadoTema = 'sin-empezar' | 'en-curso' | 'repasando' | 'dominado'

export const ESTADOS_TEMA: readonly EstadoTema[] = [
  'sin-empezar',
  'en-curso',
  'repasando',
  'dominado',
]

export type Tema = Fusionable & {
  id: string
  bloqueId: string
  nombre: string
  /** «Tema 3». Separado del nombre para poder ordenar y buscar por número. */
  numero?: string
  orden: string
  estado: EstadoTema
}

export type Esquema = Fusionable & {
  id: string
  temaId: string
  titulo: string
  nodoRaizId: string
  orden: string
}

/** Lado del mapa en el que cae la rama. Solo lo fijan los hijos de la raíz. */
export type Lado = 'izq' | 'der'

export type Nodo = Fusionable & {
  id: string
  esquemaId: string
  /** `null` solo en la raíz. */
  padreId: string | null
  /** Título corto. Se edita en el propio nodo. */
  texto: string
  /** Cuerpo largo en Markdown. Se edita en el inspector. */
  notas?: string
  orden: string
  colapsado: boolean
  /** Solo en hijos de la raíz; los descendientes heredan el lado. */
  lado?: Lado
  /** Vacío = hereda el color de su rama. */
  color?: string

  /**
   * Desplazamiento manual respecto a donde lo pondría el layout automático.
   * Se guarda como diferencia y no como posición absoluta a propósito: así el
   * resto del árbol sigue colocándose solo, el desplazamiento sigue
   * significando lo mismo aunque cambien los hermanos, y «reorganizar» es
   * simplemente borrar estos dos campos.
   */
  despX?: number
  despY?: number

  // --- repaso espaciado (SM-2); ver estudio/sm2.ts ---
  /** Última calidad respondida: 1 no me sale, 3 regular, 5 bien. */
  confianza?: number
  /** Factor de facilidad. Cuanto más alto, más se espacian los repasos. */
  facilidad?: number
  /** Días hasta el próximo repaso. */
  intervalo?: number
  /** Aciertos seguidos. Dos seguidos cuentan como dominado. */
  repeticiones?: number
  /** Momento del próximo repaso. Es lo que indexa la cola. */
  repasarEn?: number
}

export type Instantanea = {
  id: string
  tomadaEn: number
  motivo: string
  /** Fichero de trasvase serializado, tal cual. */
  contenido: string
}

export type Ajuste = {
  clave: string
  valor: unknown
}

export type NombreTabla = 'bloques' | 'temas' | 'esquemas' | 'nodos'

export const TABLAS: readonly NombreTabla[] = ['bloques', 'temas', 'esquemas', 'nodos']

/** Lo que viaja en el fichero `.schemeplay.json`. */
export type FicheroTrasvase = {
  formato: 1
  exportadoEn: number
  dispositivo: string
  alcance: 'todo' | string[]
  filas: {
    bloques: Bloque[]
    temas: Tema[]
    esquemas: Esquema[]
    nodos: Nodo[]
  }
}
