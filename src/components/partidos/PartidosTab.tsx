'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Partido, Prediccion } from '@/types'
import { TarjetaPartido } from './TarjetaPartido'
import { ModalPrediccion } from './ModalPrediccion'
import { WcStripe } from '@/components/WcStripe'

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

const ORDEN_FASES = ['grupos', 'dieciseisavos', 'octavos', 'cuartos', 'semis', 'final']

const LABEL_FASE: Record<string, string> = {
  grupos:        'Fase de Grupos',
  dieciseisavos: 'Ronda de 32',
  octavos:       'Octavos de Final',
  cuartos:       'Cuartos de Final',
  semis:         'Semifinales',
  final:         'Final',
  tercer_puesto: '3er Puesto',
}

interface Props {
  usuarioId: string
  fichas: number
  onFichasChange: (nuevas: number) => void
}

export function PartidosTab({ usuarioId, fichas, onFichasChange }: Props) {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [cargando, setCargando] = useState(true)
  const [grupoActivo, setGrupoActivo] = useState('A')
  const [partidoSeleccionado, setPartidoSeleccionado] = useState<Partido | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCargando(true)
    fetch(`/api/partidos?usuario_id=${usuarioId}&fase=all`)
      .then((r) => r.json())
      .then((data) => setPartidos(data))
      .finally(() => setCargando(false))
  }, [usuarioId])

  // Fase más temprana con partidos pendientes
  const faseActiva = useMemo(() => {
    for (const fase of ORDEN_FASES) {
      const hayPendientes = partidos.some(
        (p) => p.fase === fase && p.estado === 'pendiente'
      )
      if (hayPendientes) return fase
    }
    // Si no hay pendientes en ninguna fase, mostrar la última fase con partidos
    for (let i = ORDEN_FASES.length - 1; i >= 0; i--) {
      if (partidos.some((p) => p.fase === ORDEN_FASES[i])) return ORDEN_FASES[i]
    }
    return 'grupos'
  }, [partidos])

  const esGrupos = faseActiva === 'grupos'

  function handleGrupoClick(grupo: string) {
    setGrupoActivo(grupo)
    const container = tabsRef.current
    const btn = container?.querySelector(`[data-grupo="${grupo}"]`) as HTMLElement
    if (container && btn) {
      const offset = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2
      container.scrollTo({ left: offset, behavior: 'smooth' })
    }
  }

  function handlePartidoClick(partido: Partido) {
    const canPredict = partido.estado === 'pendiente' &&
      new Date() < new Date(new Date(partido.fecha_hora).getTime() - 5 * 60 * 1000)
    if (canPredict || partido.prediccion) {
      setPartidoSeleccionado(partido)
    }
  }

  function handlePrediccionGuardada(fichasNuevas: number, prediccion: Prediccion) {
    onFichasChange(fichasNuevas)
    setPartidos((prev) =>
      prev.map((p) =>
        p.id === prediccion.partido_id ? { ...p, prediccion } : p
      )
    )
    setPartidoSeleccionado(null)
  }

  // Partidos a mostrar según la fase activa
  const partidosFaseActiva = useMemo(() => {
    if (esGrupos) return partidos.filter((p) => p.grupo === grupoActivo)
    const principales = partidos.filter((p) => p.fase === faseActiva)
    // En la final también mostramos el partido por 3er puesto
    const extras = faseActiva === 'final'
      ? partidos.filter((p) => p.fase === 'tercer_puesto')
      : []
    return [...principales, ...extras].sort((a, b) =>
      a.fecha_hora.localeCompare(b.fecha_hora)
    )
  }, [partidos, faseActiva, esGrupos, grupoActivo])

  const conteoSinPrediccion = useMemo(() => {
    const fases = esGrupos ? ['grupos'] : [faseActiva, ...(faseActiva === 'final' ? ['tercer_puesto'] : [])]
    return partidos.filter(
      (p) =>
        fases.includes(p.fase) &&
        !p.prediccion &&
        p.estado === 'pendiente' &&
        new Date() < new Date(new Date(p.fecha_hora).getTime() - 5 * 60 * 1000)
    ).length
  }, [partidos, faseActiva, esGrupos])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Resumen */}
      {conteoSinPrediccion > 0 && (
        <div className="mx-4 mt-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/20 px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-widest">
              Partidos sin predicción
            </p>
            <p className="text-3xl font-black text-yellow-300 leading-tight">{conteoSinPrediccion}</p>
          </div>
          <Image src="/ui/icon-exclamation.png" alt="!" width={44} height={44} unoptimized />
        </div>
      )}

      {esGrupos ? (
        /* ── Tabs de grupos ── */
        <div
          ref={tabsRef}
          className="flex gap-2 px-4 py-4 overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {GRUPOS.map((g) => {
            const partidosDeGrupo = partidos.filter((p) => p.grupo === g)
            const conPrediccion = partidosDeGrupo.filter((p) => p.prediccion).length
            const totalGrupo = partidosDeGrupo.length
            const isActive = g === grupoActivo
            return (
              <button
                key={g}
                data-grupo={g}
                onClick={() => handleGrupoClick(g)}
                className={`flex flex-col items-center gap-1 shrink-0 w-12 py-2 rounded-2xl border transition-colors ${
                  isActive
                    ? 'bg-green-500 border-green-500 text-black'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="text-sm font-black">{g}</span>
                <span className={`text-xs ${isActive ? 'text-black/60' : 'text-slate-600'}`}>
                  {conPrediccion}/{totalGrupo}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        /* ── Header de fase knockout ── */
        <div className="px-4 py-3 border-b border-slate-800 shrink-0">
          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-0.5">
            Fase activa
          </p>
          <h2 className="text-base font-black text-white">
            {LABEL_FASE[faseActiva]}
          </h2>
        </div>
      )}

      {/* Partidos */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3 pt-2">
        {cargando ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-slate-900 rounded-2xl animate-pulse" />
          ))
        ) : partidosFaseActiva.length === 0 ? (
          <p className="text-slate-600 text-center py-8 text-sm">No hay partidos en esta fase</p>
        ) : (
          <>
            {!esGrupos && faseActiva === 'final' &&
              partidos.filter((p) => p.fase === 'tercer_puesto').length > 0 && (
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mt-1">
                {LABEL_FASE['final']}
              </p>
            )}
            {partidosFaseActiva.map((partido) => (
              <div key={partido.id}>
                {!esGrupos && faseActiva === 'final' && partido.fase === 'tercer_puesto' && (
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mt-3 mb-1">
                    {LABEL_FASE['tercer_puesto']}
                  </p>
                )}
                <TarjetaPartido
                  partido={partido}
                  onClick={() => handlePartidoClick(partido)}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Modal */}
      {partidoSeleccionado && (
        <ModalPrediccion
          partido={partidoSeleccionado}
          prediccionExistente={partidoSeleccionado.prediccion ?? null}
          fichas={fichas}
          usuarioId={usuarioId}
          onClose={() => setPartidoSeleccionado(null)}
          onGuardada={handlePrediccionGuardada}
        />
      )}
    </div>
  )
}
