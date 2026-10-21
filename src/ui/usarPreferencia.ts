import { useCallback, useState } from 'react'

/**
 * Preferencia de interfaz guardada en localStorage.
 *
 * No va en IndexedDB a propósito: si viajara en el fichero de trasvase, abrir
 * el esquema en el iPad te cambiaría los paneles que tienes abiertos en el
 * Mac. Son preferencias de ESTE dispositivo, no del temario.
 */
export function usarPreferencia(clave: string, porDefecto: boolean) {
  const [valor, setValor] = useState<boolean>(() => {
    try {
      const guardado = localStorage.getItem(`schemeplay.${clave}`)
      return guardado === null ? porDefecto : guardado === '1'
    } catch {
      // Safari en navegación privada puede denegar localStorage.
      return porDefecto
    }
  })

  const cambiar = useCallback(
    (siguiente: boolean | ((previo: boolean) => boolean)) => {
      setValor((previo) => {
        const nuevo = typeof siguiente === 'function' ? siguiente(previo) : siguiente
        try {
          localStorage.setItem(`schemeplay.${clave}`, nuevo ? '1' : '0')
        } catch {
          /* sin persistir, pero la sesión sigue funcionando */
        }
        return nuevo
      })
    },
    [clave],
  )

  return [valor, cambiar] as const
}
