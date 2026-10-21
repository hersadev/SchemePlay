/**
 * Las reglas de la fusión, probadas una a una.
 *
 * Es la única parte del proyecto donde un error no da un fallo visible: da una
 * pérdida silenciosa de trabajo. De ahí que tenga pruebas y el resto no.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clasificar } from '../src/datos/clasificar'
import type { Fusionable } from '../src/datos/tipos'

const AYER = 1_700_000_000_000
const HOY = 1_700_086_400_000

function fila(version: number, actualizadoEn: number, borrado = false): Fusionable {
  return { version, actualizadoEn, borrado }
}

test('una fila que no existe en local se inserta', () => {
  assert.deepEqual(clasificar(undefined, fila(1, HOY)), {
    decision: 'insertar',
    discrepa: false,
  })
})

test('gana la version más alta, venga de donde venga', () => {
  assert.equal(clasificar(fila(2, HOY), fila(5, HOY)).decision, 'sobrescribir')
  assert.equal(clasificar(fila(5, HOY), fila(2, HOY)).decision, 'ignorar')
})

test('la version manda sobre la fecha: un reloj adelantado no gana', () => {
  // El fichero trae una edición POSTERIOR (version 5) pero con fecha vieja,
  // porque el reloj de ese dispositivo va atrasado. Debe ganar igualmente.
  const local = fila(2, HOY)
  const entrante = fila(5, AYER)
  const veredicto = clasificar(local, entrante)

  assert.equal(veredicto.decision, 'sobrescribir')
  assert.equal(veredicto.discrepa, true, 'la discrepancia se reporta al usuario')
})

test('la version manda también en el sentido contrario', () => {
  // Fecha nueva pero version vieja: el reloj de origen va adelantado.
  const veredicto = clasificar(fila(5, AYER), fila(2, HOY))
  assert.equal(veredicto.decision, 'ignorar')
  assert.equal(veredicto.discrepa, true)
})

test('con empate de version desempata la fecha, y es un conflicto', () => {
  assert.deepEqual(clasificar(fila(3, AYER), fila(3, HOY)), {
    decision: 'sobrescribir',
    discrepa: true,
  })
  assert.deepEqual(clasificar(fila(3, HOY), fila(3, AYER)), {
    decision: 'ignorar',
    discrepa: true,
  })
})

test('dos filas idénticas no son conflicto: es la misma edición', () => {
  assert.deepEqual(clasificar(fila(3, HOY), fila(3, HOY)), {
    decision: 'ignorar',
    discrepa: false,
  })
})

test('un tombstone entrante más nuevo se aplica', () => {
  assert.equal(clasificar(fila(1, AYER), fila(2, HOY, true)).decision, 'sobrescribir')
})

test('un tombstone entrante más viejo NO resucita el borrado', () => {
  // Si el otro dispositivo borró en la version 2 y aquí se editó en la 4, la
  // edición local es posterior y debe conservarse.
  assert.equal(clasificar(fila(4, HOY), fila(2, AYER, true)).decision, 'ignorar')
})

test('la decisión es estable: reimportar el mismo fichero no cambia nada', () => {
  const local = fila(7, HOY)
  assert.equal(clasificar(local, { ...local }).decision, 'ignorar')
})

test('reaplicar una fusión es idempotente', () => {
  // Primera pasada: entra y gana.
  const entrante = fila(9, HOY)
  assert.equal(clasificar(fila(3, AYER), entrante).decision, 'sobrescribir')
  // Segunda pasada con la fila ya escrita: no vuelve a escribir.
  assert.equal(clasificar(entrante, entrante).decision, 'ignorar')
})
