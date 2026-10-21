/**
 * El index lleva un script en línea que marca el tema antes del primer
 * pintado. La CSP de nginx es estricta, así que ese script necesita su hash
 * en `script-src`. Como el hash cambia con cada edición del script, esto lo
 * recalcula y, con --check, falla si nginx.conf se ha quedado atrás: es un
 * fallo que no se vería en desarrollo y solo aparecería en el contenedor.
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const raizProyecto = new URL('..', import.meta.url)
const html = await readFile(new URL('index.html', raizProyecto), 'utf8')
const nginx = await readFile(new URL('seguridad.conf', raizProyecto), 'utf8')

const enLinea = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
if (enLinea.length === 0) {
  console.log('No hay scripts en línea en index.html: la CSP no necesita hashes.')
  process.exit(0)
}

const hashes = enLinea.map(
  (codigo) => `'sha256-${createHash('sha256').update(codigo, 'utf8').digest('base64')}'`,
)

if (process.argv.includes('--check')) {
  const faltan = hashes.filter((h) => !nginx.includes(h))
  if (faltan.length) {
    console.error(
      `seguridad.conf no tiene el hash del script en línea.\n` +
        `Esperado: ${faltan.join(' ')}\n` +
        `Arréglalo con: npm run csp`,
    )
    process.exit(1)
  }
  console.log('CSP al día.')
} else {
  console.log(hashes.join(' '))
}
