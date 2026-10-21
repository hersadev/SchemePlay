/**
 * El repaso espaciado, probado solo.
 *
 * Un error aquí no se ve: se traduce en repasar lo que ya te sabes y no
 * repasar lo que se te olvida. Por eso el reloj entra por parámetro.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DIA, INICIAL, estaDominado, programar, seHaVisto, toca } from '../src/estudio/sm2'

const AHORA = 1_700_000_000_000

test('el primer acierto manda el nodo a mañana', () => {
  const r = programar(undefined, 5, AHORA)
  assert.equal(r.repeticiones, 1)
  assert.equal(r.intervalo, 1)
  assert.equal(r.repasarEn, AHORA + DIA)
})

test('el segundo acierto salta a seis días', () => {
  const primero = programar(undefined, 5, AHORA)
  const segundo = programar(primero, 5, AHORA)
  assert.equal(segundo.repeticiones, 2)
  assert.equal(segundo.intervalo, 6)
})

test('a partir del tercero el intervalo se multiplica por la facilidad', () => {
  let r = programar(undefined, 5, AHORA)
  r = programar(r, 5, AHORA)
  const tercero = programar(r, 5, AHORA)
  // SM-2 actualiza el factor de facilidad ANTES de calcular el intervalo, así
  // que el multiplicador es el nuevo, no el que traía el repaso anterior.
  assert.equal(tercero.intervalo, Math.round(6 * tercero.facilidad))
  assert.ok(tercero.intervalo > 6, 'el intervalo crece')
})

test('fallar reinicia la cuenta y devuelve el nodo a mañana', () => {
  let r = programar(undefined, 5, AHORA)
  r = programar(r, 5, AHORA)
  r = programar(r, 5, AHORA)
  assert.ok(r.intervalo > 6)

  const fallo = programar(r, 1, AHORA)
  assert.equal(fallo.repeticiones, 0)
  assert.equal(fallo.intervalo, 1)
  assert.equal(fallo.repasarEn, AHORA + DIA)
})

test('fallar baja la facilidad, así que el nodo volverá antes', () => {
  const bien = programar(undefined, 5, AHORA)
  const mal = programar(undefined, 1, AHORA)
  assert.ok(mal.facilidad < INICIAL.facilidad)
  assert.ok(bien.facilidad > mal.facilidad)
})

test('la facilidad nunca baja de 1.3, o el nodo se repetiría sin fin', () => {
  let r = programar(undefined, 1, AHORA)
  for (let i = 0; i < 20; i += 1) r = programar(r, 1, AHORA)
  assert.ok(r.facilidad >= 1.3, `facilidad ${r.facilidad}`)
})

test('«regular» mantiene el avance pero no premia', () => {
  const regular = programar(undefined, 3, AHORA)
  const bien = programar(undefined, 5, AHORA)
  assert.equal(regular.repeticiones, 1, 'avanza igual que un acierto')
  assert.ok(regular.facilidad < bien.facilidad, 'pero espacia menos')
})

test('dominado a los dos aciertos seguidos, y se pierde al fallar', () => {
  assert.equal(estaDominado(undefined), false)
  const uno = programar(undefined, 5, AHORA)
  assert.equal(estaDominado(uno), false)
  const dos = programar(uno, 5, AHORA)
  assert.equal(estaDominado(dos), true)
  assert.equal(estaDominado(programar(dos, 1, AHORA)), false)
})

test('un nodo sin tocar no cuenta como visto', () => {
  assert.equal(seHaVisto(undefined), false)
  assert.equal(seHaVisto({ repeticiones: 0, intervalo: 0, facilidad: 2.5 }), false)
  assert.equal(seHaVisto(programar(undefined, 1, AHORA)), true)
})

test('toca repasar cuando llega la fecha, no antes', () => {
  const r = programar(undefined, 5, AHORA)
  assert.equal(toca(r.repasarEn, AHORA), false)
  assert.equal(toca(r.repasarEn, AHORA + DIA), true)
  assert.equal(toca(r.repasarEn, AHORA + 3 * DIA), true, 'un atrasado sigue tocando')
  assert.equal(toca(undefined, AHORA), false, 'lo que nunca se estudió no toca')
})

test('el intervalo crece de forma monótona acertando siempre', () => {
  let r = programar(undefined, 5, AHORA)
  const vistos = [r.intervalo]
  for (let i = 0; i < 6; i += 1) {
    r = programar(r, 5, AHORA)
    vistos.push(r.intervalo)
  }
  for (let i = 1; i < vistos.length; i += 1) {
    assert.ok(vistos[i]! >= vistos[i - 1]!, `intervalos: ${vistos.join(', ')}`)
  }
})
