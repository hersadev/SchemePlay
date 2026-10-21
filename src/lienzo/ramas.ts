/**
 * Geometría de las ramas.
 *
 * No son líneas con grosor: son siluetas cerradas que nacen gruesas en el
 * padre y se afinan hacia el hijo. Esa conicidad es lo que hace que un mapa
 * mental se lea como un árbol y no como un diagrama de cajas y flechas, y es
 * la razón de dibujarlas con `fill` en vez de `stroke`.
 */

function r(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}

/**
 * Camino cerrado de `(sx, sy)` a `(tx, ty)`, con `grosorIni` de media altura en
 * el nacimiento y `grosorFin` en la punta. Vale igual hacia la derecha que
 * hacia la izquierda: el signo de `dx` se encarga.
 */
export function caminoRama(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  grosorIni: number,
  grosorFin: number,
): string {
  const dx = tx - sx

  // Los tiradores se quedan dentro del tramo para que la curva salga horizontal
  // del padre y entre horizontal en el hijo, como una rama de verdad.
  const c1 = sx + dx * 0.4
  const c2 = sx + dx * 0.62

  return [
    `M ${r(sx)} ${r(sy - grosorIni)}`,
    `C ${r(c1)} ${r(sy - grosorIni)} ${r(c2)} ${r(ty - grosorFin)} ${r(tx)} ${r(ty - grosorFin)}`,
    `L ${r(tx)} ${r(ty + grosorFin)}`,
    `C ${r(c2)} ${r(ty + grosorFin)} ${r(c1)} ${r(sy + grosorIni)} ${r(sx)} ${r(sy + grosorIni)}`,
    'Z',
  ].join(' ')
}
