# SchemePlay

Mapas mentales para preparar oposición, organizados por bloques y temas. App web
instalable: se abre desde Mac, iPad y Windows sin depender del sistema operativo.

**Sin backend, sin cuenta y sin tráfico de datos.** El temario vive en la
IndexedDB del dispositivo. Para llevarlo a otro se exporta un fichero que al
importarse **fusiona**, no sustituye.

→ <https://hersadev.github.io/SchemePlay/>

El diseño completo, con las decisiones y por qué se tomaron, está en
[docs/ESQUEMA.md](docs/ESQUEMA.md).

---

## Qué hay montado

- **Editor de mapa mental** con raíz centrada, ramas a izquierda y derecha, color
  por rama y layout automático. No hay posiciones guardadas: el layout es una
  función pura del árbol, así que nunca queda descolocado.
- **Teclado primero**: `Tab` crea rama hija, `Enter` crea nodo al mismo nivel,
  flechas navegan, `Espacio` pliega, `?` abre la lista de atajos. Cada atajo
  tiene además su botón, para el iPad.
- **Deshacer y rehacer** por comandos, no por diffs de estado.
- **Biblioteca** de bloques → temas → esquemas, con estado de estudio por tema.
- **Exportar e importar** un `.schemeplay.json` con previsualización,
  instantánea automática previa y deshacer.
- **PWA**: se instala y arranca sin conexión.

Lo que aún no está: modo estudio y repaso espaciado (fase 5), y exportar a PNG,
PDF y Markdown (fase 6).

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # reglas de fusión
npm run build      # typecheck + bundle + 404.html para Pages
npm run preview    # sirve dist/ como lo hará GitHub Pages
```

## Cómo llevar el temario a otro dispositivo

1. **Ajustes → Exportar todo a un fichero.** En el iPad baja a Archivos.
2. Mueve el fichero como quieras: Drive, iCloud, AirDrop, cable o pendrive. A la
   fusión le da igual cómo haya llegado.
3. En el otro dispositivo, **Ajustes → Elegir un fichero**. Antes de aplicar
   nada verás cuántas filas se añaden, se actualizan y se ignoran, y cuáles
   están en conflicto.

Importar nunca sustituye la base local: compara fila por fila. Gana la que tenga
`version` más alta, y la fecha solo desempata. Es a propósito: los relojes del
iPad y del PC no coinciden, y ordenando por fecha un reloj adelantado haría ganar
a una edición más vieja.

Antes de cada importación se guarda una instantánea completa (se conservan las
10 últimas), así que «deshacer importación» es un botón.

## Avisos

- **Sin backend, la copia de seguridad la haces tú.** Si pierdes el dispositivo
  sin haber exportado, pierdes el temario. La app avisa si hace más de una
  semana que no exportas.
- **IndexedDB va atada al origen**, no a la ruta. Si algún día cambia el dominio,
  los datos no siguen: exporta antes de mudarte.
- Borrar «datos del sitio» en el navegador borra el temario. Instalarla como app
  lo hace menos probable, pero el fichero exportado es el respaldo de verdad.

## Estructura

```
src/
├── datos/      IndexedDB, orden fraccionario, fichero de trasvase y fusión
├── estado/     esquema abierto y pila de deshacer
├── lienzo/     layout, medición de texto, ramas, viewport y nodos
├── rutas/      panel, editor y ajustes
└── ui/         biblioteca, inspector, barra y botones
pruebas/        reglas de fusión
```

## Licencia

Uso personal.
