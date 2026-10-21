import { useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Ajustes } from './rutas/Ajustes'
import { ColaRepaso } from './rutas/ColaRepaso'
import { ModoEstudio } from './rutas/ModoEstudio'
import { EditorEsquema } from './rutas/EditorEsquema'
import { Panel } from './rutas/Panel'
import { Biblioteca } from './ui/Biblioteca'
import { Boton } from './ui/Boton'
import {
  IconoBiblioteca,
  IconoCerrar,
  IconoLuna,
  IconoPanelIzq,
  IconoSistema,
  IconoSol,
} from './ui/iconos'
import { usarTema } from './ui/usarTema'
import { usarPreferencia } from './ui/usarPreferencia'

export function App() {
  const [cajon, setCajon] = useState(false)
  const [verBiblioteca, setVerBiblioteca] = usarPreferencia('biblioteca', true)
  const { tema, siguiente } = usarTema()
  const ubicacion = useLocation()

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--fondo)]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--linea)] bg-[var(--lamina)] px-2 py-1.5">
        <Boton
          icono
          variante="fantasma"
          className="lg:hidden"
          onClick={() => setCajon(true)}
          aria-label="Abrir la biblioteca"
        >
          <IconoBiblioteca />
        </Boton>

        <Boton
          icono
          variante="fantasma"
          className="hidden lg:inline-flex"
          onClick={() => setVerBiblioteca((v) => !v)}
          title={verBiblioteca ? 'Ocultar la biblioteca' : 'Mostrar la biblioteca'}
          aria-label={verBiblioteca ? 'Ocultar la biblioteca' : 'Mostrar la biblioteca'}
          aria-pressed={verBiblioteca}
        >
          <IconoPanelIzq />
        </Boton>

        <Link
          to="/"
          className="px-1.5 font-titulo text-lg font-semibold tracking-tight text-[var(--tinta)]"
        >
          SchemePlay
        </Link>

        <Link
          to="/repaso"
          className={`ml-auto rounded-lg px-3 py-2 text-sm ${
            ubicacion.pathname === '/repaso'
              ? 'bg-[var(--acento-suave)] font-medium text-[var(--acento)]'
              : 'text-[var(--suave)] hover:bg-[var(--hundido)]'
          }`}
        >
          Repaso
        </Link>

        <Boton
          icono
          variante="fantasma"
          onClick={siguiente}
          title={
            tema === 'sistema'
              ? 'Tema: según el sistema'
              : tema === 'claro'
                ? 'Tema: claro'
                : 'Tema: oscuro'
          }
          aria-label={
            tema === 'sistema'
              ? 'Tema según el sistema. Pulsa para forzar el claro'
              : tema === 'claro'
                ? 'Tema claro. Pulsa para forzar el oscuro'
                : 'Tema oscuro. Pulsa para volver al del sistema'
          }
        >
          {tema === 'sistema' ? <IconoSistema /> : tema === 'claro' ? <IconoSol /> : <IconoLuna />}
        </Boton>

        <Link
          to="/ajustes"
          className={`rounded-lg px-3 py-2 text-sm ${
            ubicacion.pathname === '/ajustes'
              ? 'bg-[var(--acento-suave)] font-medium text-[var(--acento)]'
              : 'text-[var(--suave)] hover:bg-[var(--hundido)]'
          }`}
        >
          Ajustes
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        {verBiblioteca && (
          <aside className="hidden w-72 shrink-0 flex-col border-r border-[var(--linea)] bg-[var(--lamina)] lg:flex">
            <Biblioteca />
          </aside>
        )}

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<Panel />} />
            <Route path="/esquema/:esquemaId" element={<EditorEsquema />} />
            <Route path="/esquema/:esquemaId/estudio" element={<ModoEstudio />} />
            <Route path="/repaso" element={<ColaRepaso />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {cajon && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCajon(false)}
            aria-hidden="true"
          />
          <aside className="relative flex w-[min(19rem,85vw)] flex-col bg-[var(--lamina)] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--linea)] px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--tenue)]">
                Biblioteca
              </span>
              <Boton
                icono
                variante="fantasma"
                onClick={() => setCajon(false)}
                aria-label="Cerrar la biblioteca"
              >
                <IconoCerrar tamano={16} />
              </Boton>
            </div>
            <Biblioteca alNavegar={() => setCajon(false)} />
          </aside>
        </div>
      )}
    </div>
  )
}
