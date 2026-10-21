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
- **Mover nodos a mano**: arrastra uno y su rama entera le sigue. El
  desplazamiento se guarda como diferencia respecto al layout automático, así
  que el resto del mapa sigue colocándose solo y «Reorganizar» lo devuelve todo
  a su sitio.
- **Deshacer y rehacer** por comandos, no por diffs de estado.
- **Biblioteca** de bloques → temas → esquemas. Las barras de la izquierda y de
  la derecha se pliegan, y la preferencia se recuerda en cada dispositivo.
- **Modo estudio** con tres formas de taparse el esquema: revelado progresivo,
  hojas tapadas y recitar de memoria.
- **Repaso espaciado** (SM-2): valoras cada nodo y el algoritmo decide cuándo
  vuelve. `/repaso` junta lo que toca hoy mezclando temas y bloques.
- **Progreso** por esquema, tema y bloque, derivado del repaso. El estado de un
  tema no se marca a mano: sale de cuántos nodos has acertado dos veces
  seguidas.
- **Exportar e importar** un `.schemeplay.json` con previsualización,
  instantánea automática previa y deshacer.
- **PWA**: se instala y arranca sin conexión.

Lo que aún no está: exportar a PNG, PDF y Markdown (fase 6).

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # reglas de fusión y repaso espaciado
npm run build      # typecheck + bundle + 404.html para Pages
npm run preview    # sirve dist/ como lo hará GitHub Pages
```

## Docker

```bash
docker compose up --build        # en http://localhost:8080
```

La imagen se construye en dos etapas y la final solo lleva nginx con los
estáticos: unos 76 MB, sin Node ni `node_modules`. Las pruebas corren dentro
del build, así que una imagen que termina es una imagen cuyas reglas de fusión
y de repaso pasan.

El contenedor **no guarda nada**: los esquemas viven en la IndexedDB del
navegador de cada dispositivo. Puedes borrarlo y recrearlo sin perder nada.

En GitHub Pages la app cuelga de `/SchemePlay/` y en Docker de la raíz; la ruta
es un argumento de construcción:

```bash
docker build --build-arg BASE_PATH=/esquemas/ -t schemeplay .
```

Ojo: IndexedDB va atada al origen. Servir la misma app en `localhost:8080` y en
`hersadev.github.io` son dos almacenes distintos, y el fichero de trasvase es
el puente entre ellos.

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
├── estudio/    repaso espaciado (SM-2) y cálculo de progreso
├── lienzo/     layout, medición de texto, ramas, viewport y nodos
├── rutas/      panel, editor, modo estudio, cola de repaso y ajustes
└── ui/         biblioteca, inspector, barra y botones
pruebas/        reglas de fusión y repaso espaciado
```

Las dos piezas con pruebas son `datos/clasificar.ts` y `estudio/sm2.ts`. Son
las únicas donde un error no da un fallo visible: una pierde trabajo en
silencio al importar y la otra te hace repasar lo que ya te sabes.

## Licencia

Uso personal.
