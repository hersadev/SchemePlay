/** Identificadores y sello de edición. */

export function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Respaldo para contextos sin crypto.randomUUID (Safari antiguo sobre http).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const CLAVE_DISPOSITIVO = 'schemeplay.dispositivo'

/**
 * Id estable de este dispositivo, generado en el primer arranque. Solo sirve
 * para que el nombre del fichero exportado diga de dónde viene y para poder
 * explicar los conflictos («gana la versión del iPad»).
 */
export function idDispositivo(): string {
  const guardado = localStorage.getItem(CLAVE_DISPOSITIVO)
  if (guardado) return guardado
  const nuevo = `${nombrePlataforma()}-${Math.random().toString(36).slice(2, 7)}`
  localStorage.setItem(CLAVE_DISPOSITIVO, nuevo)
  return nuevo
}

export function renombrarDispositivo(nombre: string): void {
  const limpio = nombre.trim().replace(/\s+/g, '-').slice(0, 40)
  if (limpio) localStorage.setItem(CLAVE_DISPOSITIVO, limpio)
}

function nombrePlataforma(): string {
  const ua = navigator.userAgent
  if (/iPad/.test(ua)) return 'ipad'
  if (/iPhone/.test(ua)) return 'iphone'
  // iPadOS 13+ se anuncia como Mac; el táctil es lo que lo delata.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ipad'
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac'
  if (/Windows/.test(ua)) return 'windows'
  if (/Android/.test(ua)) return 'android'
  if (/Linux/.test(ua)) return 'linux'
  return 'equipo'
}

/** Campos de `Fusionable` para una fila que acaba de editarse localmente. */
export function sello(versionActual = 0): { version: number; actualizadoEn: number } {
  return { version: versionActual + 1, actualizadoEn: Date.now() }
}
