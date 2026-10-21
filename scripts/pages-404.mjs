/**
 * GitHub Pages sirve ficheros estáticos: una visita directa a
 * /SchemePlay/esquema/xxx no corresponde a ningún fichero y devuelve 404 antes
 * de que React Router pueda mirar la URL.
 *
 * El remedio estándar es un 404.html idéntico al index: Pages lo sirve para
 * cualquier ruta que no exista, el bundle arranca y el router resuelve. El
 * service worker también lo cubre con navigateFallback, pero solo a partir de
 * la segunda visita, cuando ya está instalado.
 */
import { copyFile } from 'node:fs/promises'

const origen = new URL('../dist/index.html', import.meta.url)
const destino = new URL('../dist/404.html', import.meta.url)

await copyFile(origen, destino)
console.log('404.html generado a partir de index.html')
