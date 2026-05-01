'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Partido, Prediccion } from '@/types'
import { TarjetaPartido } from './TarjetaPartido'
import { ModalPrediccion } from './ModalPrediccion'
import { WcStripe } from '@/components/WcStripe'

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

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
    fetch(`/api/partidos?usuario_id=${usuarioId}&fase=grupos`)
      .then((r) => r.json())
      .then((data) => setPartidos(data))
      .finally(() => setCargando(false))
  }, [usuarioId])

  function handleGrupoClick(grupo: string) {
    setGrupoActivo(grupo)
    // Centrar tab activo
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

  const partidosGrupo = partidos.filter((p) => p.grupo === grupoActivo)
  const conteoSinPrediccion = partidos.filter(
    (p) =>
      !p.prediccion &&
      p.estado === 'pendiente' &&
      new Date() < new Date(new Date(p.fecha_hora).getTime() - 5 * 60 * 1000)
  ).length

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
          <Image src="/ui/icon-coins.png" alt="fichas" width={52} height={52} unoptimized />
        </div>
      )}

      {/* Tabs de grupos */}
      <div
        ref={tabsRef}
        className="flex gap-2 px-4 py-4 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {GRUPOS.map((g) => {
          const partidosDeGrupo = partidos.filter((p) => p.grupo === g)
          const conPrediccion = partidosDeGrupo.filter((p) => p.prediccion).length
          const isActive = g === grupoActivo
          return (
            <button
              key={g}
              data-grupo={g}
              onClick={() => handleGrupoClick(g)}
              className={`flex flex-col items-center shrink-0 w-12 py-2 rounded-2xl border transition-colors ${
                isActive
                  ? 'bg-green-500 border-green-500 text-black'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className="text-sm font-black">{g}</span>
              <span className={`text-xs ${isActive ? 'text-black/60' : 'text-slate-600'}`}>
                {conPrediccion}/3
              </span>
            </button>
          )
        })}
      </div>

      {/* Partidos del grupo */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {cargando ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-slate-900 rounded-2xl animate-pulse" />
          ))
        ) : partidosGrupo.length === 0 ? (
          <p className="text-slate-600 text-center py-8 text-sm">No hay partidos en este grupo</p>
        ) : (
          partidosGrupo.map((partido) => (
            <TarjetaPartido
              key={partido.id}
              partido={partido}
              onClick={() => handlePartidoClick(partido)}
            />
          ))
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
