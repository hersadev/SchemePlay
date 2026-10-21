# SchemePlay — Esquema de la aplicación

App para crear y estudiar mapas mentales, organizados por bloques y temas de
oposición. Un solo código base para Mac, iPad y Windows.

**App web (PWA)** servida desde un hosting estático: la abres desde cualquier
sistema operativo y se instala como app. **Sin backend, sin cuenta y sin
tráfico de datos.** Tu temario vive en el dispositivo; para pasarlo a otro se
exporta un fichero —por Drive, AirDrop o un cable— que al importarse
**fusiona**, no sustituye (sección 6).

---

## 1. Decisión de plataforma y distribución

El requisito duro es **iOS (iPad) + Windows + macOS**. Eso descarta Electron
(no tiene iOS) y hace cuesta arriba React Native (el lienzo de pan/zoom con
cientos de nodos se sufre).

**Recomendación: PWA primero, con React + Vite + TypeScript.**

| Plataforma | Cómo se instala | Nativo: opcional y nunca necesario |
|---|---|---|
| iPad / iPhone | Safari → «Añadir a pantalla de inicio». Pantalla completa, funciona sin conexión | Si quieres estar en la App Store: envolver con **Capacitor** |
| Windows | Edge/Chrome → «Instalar app». Ventana propia, icono en el menú | Si quieres .msi/.exe firmado: **Tauri 2** |
| macOS | Igual que Windows | **Tauri 2** (mismo binario del código web, ~5 MB) |

Por qué esta ruta: escribes el editor **una vez**. Tauri 2 y Capacitor
reempaquetan el mismo `dist/` sin reescribir nada, así que la decisión de
«¿necesito app nativa de verdad?» se puede aplazar a la fase 6 sin coste.

### Stack

| Capa | Elección | Motivo |
|---|---|---|
| UI | React 18 + TypeScript + Vite | Lo que ya usas en JSPlay/WriteXP |
| Lienzo | Propio: SVG + Pointer Events | Ver «Lo que cambió al construirlo», más abajo |
| Layout automático | Propio, recursivo | Un mapa mental es un árbol; el algoritmo cabe en 120 líneas y da control total sobre el reparto izquierda/derecha |
| Estado | Zustand + Immer | Edición del árbol sin boilerplate; ya lo conoces |
| Persistencia | Dexie (IndexedDB) | Única fuente de verdad; offline real en los tres sistemas |
| Trasvase | Fichero `.schemeplay.json` + motor de fusión propio | Sin servidor ni cuenta; ver sección 6 |
| Orden de hermanos | `fractional-indexing` | Insertar entre dos nodos toca una fila |
| Estilos | Tailwind | Igual que JSPlay |
| Exportación | `html-to-image` (PNG), `jsPDF` (PDF), serializador propio (Markdown/OPML) |

**Lo que no lleva:** ni backend, ni autenticación, ni cliente HTTP, ni
WebSockets. No hay nada que registrar, ni datos personales, ni término de
servicio que cumplir.

### Lo que cambió al construirlo

El esquema pedía **React Flow** para el lienzo y **d3-hierarchy** para el
layout. Al montarlo se cayeron los dos, y conviene dejar escrito por qué:

- Como el layout, la medición del texto y la forma de las ramas se calculan
  aquí de todas formas, React Flow solo aportaba el viewport. A cambio metía
  unos 100 KB y un distintivo de atribución en una esquina de la app. El pan,
  el zoom y la pinza con Pointer Events son unas 180 líneas en
  `lienzo/usarViewport.ts`.
- `d3-hierarchy` reparte un árbol, pero aquí hace falta algo que además decida
  lado izquierdo o derecho por rama y centre cada lado por separado. Sale más
  corto escribirlo que adaptarlo.

El bundle queda en 110 KB comprimidos, dependencias incluidas.

### Cómo llega la app a cada dispositivo

Sí, es una app web: React compilado a HTML, JS y CSS. Eso es exactamente lo que
la hace independiente del sistema operativo. Pero una app web tiene que
servirse desde alguna URL, y hay que separar dos cosas que suenan parecidas:

| | Qué viaja | Dónde vive |
|---|---|---|
| **El código de la app** | HTML, JS y CSS. Ni un dato tuyo | Hosting estático |
| **Tu temario** | Nada. No sale del dispositivo salvo que tú exportes | IndexedDB de cada dispositivo |

Subir el código no es subir tus esquemas. El hosting es un servidor de ficheros
estáticos: no hay base de datos detrás ni nada a lo que mandar nada.

**Recomendación: Cloudflare Pages o GitHub Pages.** Gratis, se despliega con un
`git push` y trae HTTPS, que es obligatorio para que funcione el service worker
y, con él, el modo sin conexión. Visitas la URL una vez en cada dispositivo, le
das a «instalar» y desde entonces arranca sin red.

Descartadas:

- **Abrir el `index.html` con `file://`** — sin service worker no hay PWA ni
  modo offline, y el origen opaco hace que IndexedDB se comporte de forma
  inconsistente entre navegadores.
- **`npm run dev` en cada máquina** — impracticable en un iPad.

Si te incomoda que la URL sea pública: en el código no hay nada sensible, pero
Cloudflare Access permite cerrar el sitio a tu propio correo en dos clics.

---

## 2. Modelo de datos

Jerarquía de cuatro niveles más los nodos del mapa:

```
Oposición            ← opcional; si solo preparas una, queda implícita
└── Bloque           «Bloque I — Organización del Estado»
    └── Tema         «Tema 3 — La Constitución de 1978»
        └── Esquema  un mapa mental (un tema puede tener varios)
            └── Nodo árbol de nodos
```

### Tablas

```ts
// Las cuatro tablas comparten los campos que hacen posible la fusión.
// Sin ellos, importar solo podría sustituir.
type Fusionable = {
  version: number        // sube en cada edición local; manda sobre la fecha
  actualizadoEn: number  // solo para deshacer empates de version
  borrado?: boolean      // tombstone; nunca se hace DELETE de verdad
}

type Bloque = Fusionable & {
  id: string             // uuid
  nombre: string
  color: string          // color base que heredan sus temas
  orden: string
}

type Tema = Fusionable & {
  id: string
  bloqueId: string
  nombre: string
  numero?: string        // «Tema 3»
  orden: string
  estado: 'sin-empezar' | 'en-curso' | 'repasando' | 'dominado'
}

type Esquema = Fusionable & {
  id: string
  temaId: string
  titulo: string
  nodoRaizId: string
  orden: string
}

type Nodo = Fusionable & {
  id: string
  esquemaId: string
  padreId: string | null   // null = raíz
  texto: string            // título corto del nodo
  notas?: string           // cuerpo largo en Markdown
  orden: string            // índice fraccionario
  colapsado: boolean
  lado?: 'izq' | 'der'     // solo los hijos de la raíz; el resto lo hereda
  color?: string           // vacío = hereda del padre
  icono?: string           // emoji o nombre de icono
  confianza?: 0 | 1 | 2 | 3 | 4 | 5   // para el repaso espaciado
  repasarEn?: number       // timestamp de la próxima revisión
}

type Etiqueta = { id: string; nombre: string; color: string }
type NodoEtiqueta = { nodoId: string; etiquetaId: string }
```

**Dos decisiones que importan:**

1. **Nodos planos con `padreId`**, no JSON anidado. Permite fusionar nodo a
   nodo al importar (un conflicto afecta a un nodo, no al mapa entero), buscar
   con un solo índice y reordenar sin reescribir hermanos.
2. **`orden` como índice fraccionario** (cadena, estilo `a0` / `a0V` / `a1`) en
   vez de entero. Insertar entre dos hermanos toca **una** fila, no N. Librería:
   `fractional-indexing`.

### Índices Dexie

```
bloques:   id, orden, actualizadoEn
temas:     id, bloqueId, orden, estado, actualizadoEn
esquemas:  id, temaId, orden, actualizadoEn
nodos:     id, esquemaId, [esquemaId+padreId], repasarEn, actualizadoEn
instantaneas: id, tomadaEn   // copias previas a cada importación
```

---

## 3. Estructura de pantallas

```
┌───────────────┬──────────────────────────────────┬──────────────┐
│  BARRA LATERAL│            LIENZO                │  INSPECTOR   │
│               │                                  │              │
│ 🔍 buscar     │        ┌─────────┐               │ Nodo         │
│               │   ┌────┤  Tema 3 ├────┐          │ ─────────    │
│ ▼ Bloque I    │   │    └─────────┘    │          │ Texto        │
│   · Tema 1 ✓  │ ┌─┴──┐           ┌────┴─┐        │ Notas (md)   │
│   · Tema 2 ◐  │ │Art.│           │Título│        │ Color        │
│   · Tema 3 ●  │ └────┘           │  II  │        │ Etiquetas    │
│ ▶ Bloque II   │                  └──────┘        │ Confianza    │
│ ▶ Bloque III  │                                  │              │
│               │  [+] [layout] [estudio] [export] │              │
│ ⚙︎ Ajustes     │                                  │              │
└───────────────┴──────────────────────────────────┴──────────────┘
```

- **Mac / Windows**: tres paneles a la vez, redimensionables.
- **iPad horizontal**: tres paneles; el inspector se solapa al editar.
- **iPad vertical / móvil**: solo lienzo. Lateral como cajón deslizante,
  inspector como hoja inferior (`bottom sheet`).

### Rutas

```
/                        → panel de bloques y progreso general
/bloque/:id              → lista de temas del bloque
/tema/:id                → esquemas del tema
/esquema/:id             → editor de mapa mental
/esquema/:id/estudio     → modo estudio
/repaso                  → cola de repaso espaciado de hoy
/ajustes                 → cuenta, sync, exportación, copias
```

---

## 4. Interacción del editor

Esto es lo que decide si la app se usa o se abandona: crear un esquema tiene
que ir más rápido que escribirlo en papel.

### Teclado (Mac / Windows) — modelo tipo outliner

| Tecla | Acción |
|---|---|
| `Tab` | Crear nodo **hijo** del seleccionado |
| `Enter` | Crear nodo **hermano** debajo |
| `Shift`+`Tab` | Sacar el nodo un nivel (hacerlo hermano del padre) |
| `↑ ↓ ← →` | Navegar por el árbol |
| `Espacio` | Plegar / desplegar rama |
| `Cmd/Ctrl`+`Enter` | Abrir notas largas del nodo |
| `Cmd/Ctrl`+`K` | Paleta de comandos (saltar a tema, color, etiqueta) |
| `Supr` | Borrar nodo y descendientes (con deshacer) |

El foco nunca sale del lienzo: escribir el texto del nodo se hace en el propio
nodo, no en un formulario aparte.

### Táctil (iPad)

- Tocar un nodo → aparecen tiradores `+` a los lados para crear hijo/hermano.
- Pulsación larga + arrastrar → reasignar padre (la rama de destino se ilumina).
- Dos dedos para desplazar, pinza para zoom; doble toque para ajustar a pantalla.
- Apple Pencil: capa opcional de anotación a mano alzada **encima** del mapa,
  guardada como trazos aparte (no deforma el árbol).

### Deshacer

Pila de comandos propia (`crearNodo`, `moverNodo`, `editarTexto`…) con
`deshacer`/`rehacer`, no diffs de estado. Es lo único que aguanta un editor de
árboles sin corromper el orden fraccionario.

---

## 5. Modo estudio

Lo que separa esto de un mapa mental genérico: el esquema no es el producto
final, es el material de repaso.

1. **Revelado progresivo** — todo plegado; vas abriendo ramas intentando
   recordar antes qué había debajo.
2. **Hojas tapadas** — se ven las ramas pero los nodos finales están cubiertos;
   los destapas uno a uno.
3. **Recitar el tema** — el mapa se oculta y solo queda la raíz; reconstruyes el
   esquema de memoria y luego comparas.
4. **Repaso espaciado** — cada nodo o rama recibe una confianza de 1 a 5 y
   SM-2 simplificado calcula `repasarEn`. La ruta `/repaso` junta todo lo que
   toca hoy, mezclando temas de bloques distintos.
5. **Progreso** — porcentaje de nodos dominados por tema y por bloque, visible
   en el panel inicial. El `estado` del tema se deduce de ahí.

---

## 6. Trasvase entre dispositivos, sin servidor

No hay cuenta, no hay servidor y la app no contiene código de red. Lo que mueve
la información de un dispositivo a otro es **un fichero**.

La parte delicada no es exportar, es importar: lo que pides —«importarla a otro
y que se actualice»— significa **fusionar**, no sustituir. Si la importación
reemplaza la base local, cada trasvase se come lo que hubieras hecho en ese
dispositivo mientras tanto.

### El fichero

`oposicion-2026-10-21-ipad.schemeplay.json`

```jsonc
{
  "formato": 1,
  "exportadoEn": 1761045600000,
  "dispositivo": "ipad-de-juanjo",   // id estable del primer arranque
  "alcance": "todo",                 // o ["bloque:xxx", "tema:yyy"]
  "filas": {
    "bloques":  [ /* … */ ],
    "temas":    [ /* … */ ],
    "esquemas": [ /* … */ ],
    "nodos":    [ /* … */ ]
  }
}
```

Texto plano comprimible, legible y versionado con `formato` para que un fichero
viejo se pueda seguir leyendo dentro de un año.

### La fusión, fila por fila

```
Para cada fila entrante:
  no existe en local         → insertar
  version entrante MAYOR     → sobrescribir la local
  version entrante MENOR     → ignorar
  empate de version          → gana actualizadoEn más alto
  empate total               → ignorar (son la misma edición)
  borrado: true              → marcar borrada en local, sin DELETE
```

`version` va **antes** que la fecha a propósito: los relojes del iPad y del PC
no coinciden y, ordenando solo por fecha, un reloj adelantado haría ganar a una
edición más vieja. El contador sube en cada edición local, así que una cadena
normal de «importo, edito, exporto» siempre resuelve bien.

Al ser filas independientes, el peor conflicto posible pierde la edición de
**un** nodo, nunca un esquema entero.

### Antes de cada importación

- **Instantánea automática** de toda la base local en IndexedDB. Se conservan
  las 10 últimas, de modo que «Deshacer importación» es un botón y no una
  reconstrucción a mano.
- **Previsualización**: «se añaden 34 nodos, se actualizan 12, 2 en conflicto
  (gana la versión del iPad)», con opción de cancelar.
- **Importación parcial**: traer solo un bloque o un tema concreto en vez de
  todo, útil para pasar un tema al iPad sin arrastrar el resto.

### Drive como mensajero

Lo que describes —exportar, subirlo a Drive, bajarlo y actualizar cuando
quieras— funciona **sin tocar una línea del motor de fusión**. A `fusion.ts` le
da igual cómo haya llegado el fichero: solo mira las filas que trae.

```
   Mac                      Drive                     iPad
    │                         │                         │
    ├ Ajustes › Exportar      │                         │
    │  baja el .json ─────────▶  lo subes tú            │
    │                         │                         │
    │                         │ ──── lo descargas ─────▶│
    │                         │                         ├ Ajustes › Importar
    │                         │                         ├ previsualización
    │                         │                         └ fusionar  ✓
```

En el iPad el circuito se cierra sin salir de la app: la app de Google Drive se
registra como proveedor en Archivos, así que el selector de
`<input type="file">` ve Drive directamente, y el fichero exportado se guarda en
Archivos listo para subirlo.

Lo mismo sirve para iCloud Drive, OneDrive, Dropbox, AirDrop, un cable o un
pendrive. Drive es solo el mensajero, y es intercambiable.

### El salto opcional: la API de Drive

Si los cuatro toques de pantalla acaban cansando, el siguiente nivel es que la
app suba y baje ella misma un único fichero fijo, con permiso `drive.file`, que
da acceso **solo** a los ficheros que la propia app crea. Dos botones: «Subir a
Drive» y «Traer de Drive».

Lo que cuesta, para decidirlo con los números delante:

- Proyecto en Google Cloud, pantalla de consentimiento OAuth y un client id.
- Con la app en estado «testing», el refresh token caduca cada 7 días: toca
  volver a dar permiso cada semana. Para evitarlo hay que publicarla, y Google
  revisa las apps que piden permisos de Drive.
- Deja de ser una app sin red: entra un cliente HTTP y la gestión de tokens, lo
  que contradice parte de lo que la hace simple.

Por eso el orden es: fase 4 manual, y la API solo si la molestia es real.

### Otro atajo, solo en escritorio

La **File System Access API** (Chrome y Edge en Mac y Windows, no Safari) deja
que la app recuerde el fichero: «Guardar» escribe encima del mismo sin diálogo.
Si ese fichero está en la carpeta local de Drive, el cliente de escritorio lo
sube solo. Son unas 40 líneas y no requiere OAuth.

### Detalles que no se pueden olvidar

- Pedir `navigator.storage.persist()` en iOS: Safari desaloja IndexedDB de
  sitios «poco usados» y sin eso puedes perder trabajo local.
- Copia automática semanal a fichero, con aviso si hace más de N días que no se
  exporta. Sin servidor, la copia de seguridad es responsabilidad de la app.
- Validar el fichero al importar (`formato`, esquema de filas, `nodoRaizId`
  existente) antes de tocar nada: un JSON a medias no debe dejar la base
  inconsistente.

---

## 7. Árbol de ficheros

```
SchemePlay/
├── docs/
│   └── ESQUEMA.md
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── rutas/
│   │   ├── Panel.tsx
│   │   ├── VistaBloque.tsx
│   │   ├── VistaTema.tsx
│   │   ├── EditorEsquema.tsx
│   │   ├── ModoEstudio.tsx
│   │   └── ColaRepaso.tsx
│   ├── lienzo/
│   │   ├── Lienzo.tsx              # lienzo, atajos y edición en línea
│   │   ├── NodoMental.tsx          # caja del nodo
│   │   ├── estilo.ts               # métrica y paleta, compartidas con la medición
│   │   ├── medir.ts                # measureText fuera de pantalla
│   │   ├── layout.ts               # árbol → coordenadas
│   │   ├── ramas.ts                # siluetas cónicas de las ramas
│   │   └── usarViewport.ts         # pan, zoom y pinza
│   ├── estado/
│   │   ├── almacenEsquema.ts       # Zustand: árbol en edición
│   │   ├── almacenBiblioteca.ts    # bloques y temas
│   │   ├── comandos.ts             # deshacer/rehacer
│   │   └── selectores.ts
│   ├── datos/
│   │   ├── db.ts                   # esquema Dexie
│   │   ├── tipos.ts
│   │   ├── clasificar.ts           # la decisión de la fusión, pura y con pruebas
│   │   ├── fusion.ts               # fusión fila por fila al importar
│   │   ├── instantaneas.ts         # copia previa + deshacer importación
│   │   ├── fichero.ts              # leer y escribir .schemeplay.json
│   │   └── orden.ts                # índices fraccionarios
│   ├── estudio/
│   │   ├── sm2.ts                  # repaso espaciado
│   │   └── progreso.ts
│   ├── exportar/
│   │   ├── aPng.ts
│   │   ├── aPdf.ts
│   │   ├── aMarkdown.ts
│   │   └── aJson.ts                # fichero de trasvase y copia
│   ├── ui/                         # botones, hojas, cajones, paleta
│   └── estilos/
│       └── global.css
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

Más adelante, sin tocar `src/`:

```
├── src-tauri/     # fase 6 — Windows y macOS nativos
└── ios/           # fase 6 — Capacitor, si quieres App Store
```

---

## 8. Fases

| Fase | Qué entrega | Resultado visible |
|---|---|---|
| **0** | Vite + TS + Tailwind + rutas + manifest PWA + despliegue a Cloudflare Pages | Ya la abres e instalas desde Mac, iPad y Windows, aún vacía |
| **1** | Lienzo propio, layout del árbol, ramas cónicas, atajos de teclado, deshacer | Ya puedes dibujar un esquema |
| **2** | Dexie + CRUD de bloques, temas y esquemas, lateral, buscador | Biblioteca completa, persistente, offline |
| **3** | Pulido táctil para iPad: gestos, tiradores, hoja inferior, cajón | Usable de verdad en iPad |
| **4** | `fusion.ts`, exportar/importar fichero, previsualización, instantáneas y deshacer | El mismo esquema en Mac, iPad y Windows |
| **5** | Modo estudio, SM-2, cola de repaso, progreso por bloque | Deja de ser un editor y pasa a ser herramienta de estudio |
| **6** | Exportar a PNG, PDF y Markdown; File System Access en escritorio | Imprimir esquemas y guardar sin diálogo en Mac y Windows |

Las fases 0–2 ya dan algo que usas a diario. La 4 es la que cumple el requisito
de los tres dispositivos y, sin servidor, cuesta bastante menos que la versión
con backend: es un fichero y una función de fusión bien probada.

Fuera de estas fases quedan, como opcionales y solo si hacen falta: la API de
Drive (sección 6) y el empaquetado nativo con Tauri y Capacitor. Al ser una app
web desplegada, lo nativo ya no aporta alcance, solo comodidad de trasvase.

---

## 9. Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| **Sin servidor no hay copia de seguridad**: un iPad perdido se lleva el temario | Aviso en pantalla si hace más de N días que no exportas, más copia automática semanal a fichero |
| **Cambiar de dominio deja los datos atrás**: IndexedDB va atada al origen | Fijar la URL definitiva en la fase 0, antes de meter temario de verdad; si hay mudanza, exportar primero |
| Borrar los datos del sitio en el navegador borra el temario | Instalar como PWA (los datos instalados son más persistentes), `storage.persist()` y copia semanal |
| Importar pisa trabajo más reciente del dispositivo destino | Fusión fila por fila, nunca sustitución; previsualización antes de aplicar; instantánea y «deshacer importación» |
| Relojes descuadrados entre iPad y PC invierten quién gana | Ordenar por `version` y usar `actualizadoEn` solo para empates |
| Safari en iOS desaloja IndexedDB | `navigator.storage.persist()` y la copia semanal como respaldo |
| Esquemas de 500+ nodos tiran el frame rate | Layout memoizado y ramas plegadas por defecto. Pendiente: no pintar lo que cae fuera del viewport |
| Reordenar hermanos corrompe el orden | Índices fraccionarios y test de propiedades sobre `orden.ts` |
| Un fichero a medias deja la base inconsistente | Validar `formato` y filas enteras antes de escribir; importar en una sola transacción de Dexie |
| El editor táctil queda peor que el de teclado | Fase 3 dedicada solo a iPad, con el iPad delante, no al final |

---

## 10. Decisión pendiente

**¿Cuánto trabajo manual aceptas en cada trasvase?**

La fusión es idéntica en los tres casos; lo único que cambia es quién mueve el
fichero. Van de menos a más automático y, a la vez, de menos a más dependencia
de terceros.

- **A mano con Drive.** Exportas, lo subes a Drive, lo bajas en el otro
  dispositivo, importas. Cuatro toques, cero infraestructura, ningún permiso
  concedido a nadie. Es lo que tienes al acabar la fase 4 y es lo que has
  descrito tú.
- **Semiautomático en escritorio.** File System Access API: en Mac y Windows la
  app escribe encima del mismo fichero sin diálogo y, si está en la carpeta
  local de Drive, el cliente lo sube solo. Unas 40 líneas, sin OAuth. En el
  iPad sigue siendo manual, porque Safari no expone esa API.
- **La app habla con Drive.** Permiso `drive.file` y dos botones. Lo más cómodo
  y lo único que mete red en una app que ahora no la tiene, además de un
  proyecto de Google Cloud y un reconsentimiento semanal mientras esté en
  «testing».

Las fases 0 a 5 son idénticas en los tres casos, así que la decisión no bloquea
nada. Mi recomendación es empezar por la primera y añadir la segunda cuando
tengas temario de verdad dentro.
