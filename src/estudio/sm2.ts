/**
 * Repaso espaciado, SM-2 simplificado.
 *
 * Puro y sin dependencias, como `datos/clasificar.ts`, para poder probarlo
 * solo: aquí un error no se ve: se traduce en repasar lo que ya te sabes y no
 * repasar lo que se te olvida, que es justo lo contrario de lo que quieres.
 *
 * Referencia: SuperMemo 2 (Wozniak, 1987), con dos simplificaciones:
 * no se guarda historial y las calidades se reducen a tres botones.
 */

export const DIA = 86_400_000

/** Lo que el usuario responde al destapar un nodo. */
export type Calidad = 1 | 3 | 5

export const CALIDADES: ReadonlyArray<{ valor: Calidad; etiqueta: string; pista: string }> = [
  { valor: 1, etiqueta: 'No me sale', pista: 'Vuelve mañana' },
  { valor: 3, etiqueta: 'Regular', pista: 'Lo sabías a medias' },
  { valor: 5, etiqueta: 'Bien', pista: 'Lo tienes' },
]

export type EstadoRepaso = {
  /** Factor de facilidad. Cuanto más alto, más se espacian los repasos. */
  facilidad: number
  /** Días hasta el próximo repaso. */
  intervalo: number
  /** Aciertos seguidos. Se reinicia a cero en cuanto fallas. */
  repeticiones: number
}

export const INICIAL: EstadoRepaso = { facilidad: 2.5, intervalo: 0, repeticiones: 0 }

/** Por debajo de esto el algoritmo deja de espaciar y machaca el nodo. */
const FACILIDAD_MINIMA = 1.3

export type Programacion = EstadoRepaso & { repasarEn: number }

/**
 * Calcula el siguiente repaso. `ahora` es parámetro para que las pruebas no
 * dependan del reloj.
 */
export function programar(
  previo: Partial<EstadoRepaso> | undefined,
  calidad: Calidad,
  ahora: number = Date.now(),
): Programacion {
  const estado: EstadoRepaso = {
    facilidad: previo?.facilidad ?? INICIAL.facilidad,
    intervalo: previo?.intervalo ?? INICIAL.intervalo,
    repeticiones: previo?.repeticiones ?? INICIAL.repeticiones,
  }

  // El factor de facilidad se mueve siempre, también cuando fallas: es lo que
  // hace que un nodo que se te atraganta acabe apareciendo más a menudo que
  // uno que solo fallaste una vez.
  const ajuste = 0.1 - (5 - calidad) * (0.08 + (5 - calidad) * 0.02)
  const facilidad = Math.max(FACILIDAD_MINIMA, estado.facilidad + ajuste)

  // Fallar reinicia la cuenta: mañana otra vez, se supiera lo que se supiera.
  if (calidad < 3) {
    return { facilidad, intervalo: 1, repeticiones: 0, repasarEn: ahora + DIA }
  }

  const repeticiones = estado.repeticiones + 1
  const intervalo =
    repeticiones === 1 ? 1 : repeticiones === 2 ? 6 : Math.round(estado.intervalo * facilidad)

  return { facilidad, intervalo, repeticiones, repasarEn: ahora + intervalo * DIA }
}

/**
 * Un nodo se da por dominado tras dos aciertos seguidos. Es el umbral en el
 * que SM-2 salta al intervalo largo, así que es el punto en el que el propio
 * algoritmo deja de insistir.
 */
export function estaDominado(estado: Partial<EstadoRepaso> | undefined): boolean {
  return (estado?.repeticiones ?? 0) >= 2
}

export function seHaVisto(estado: Partial<EstadoRepaso> | undefined): boolean {
  return (estado?.repeticiones ?? 0) > 0 || (estado?.intervalo ?? 0) > 0
}

/** Si toca repasarlo hoy o ya se pasó la fecha. */
export function toca(repasarEn: number | undefined, ahora: number = Date.now()): boolean {
  if (repasarEn === undefined) return false
  return repasarEn <= ahora
}

export function enCuantosDias(repasarEn: number, ahora: number = Date.now()): number {
  return Math.round((repasarEn - ahora) / DIA)
}
