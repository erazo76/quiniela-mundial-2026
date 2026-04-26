'use client'
import Image from 'next/image'
import { Partido } from '@/types'

interface Props {
  partido: Partido
  onClick: () => void
}

function formatFecha(isoString: string) {
  const d = new Date(isoString)
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatHora(isoString: string) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function canPredict(partido: Partido) {
  if (partido.estado !== 'pendiente') return false
  const limitePrediccion = new Date(new Date(partido.fecha_hora).getTime() - 5 * 60 * 1000)
  return new Date() < limitePrediccion
}

function Bandera({ src, nombre }: { src: string | null; nombre: string }) {
  if (!src) {
    return (
      <div className="w-10 h-7 rounded bg-slate-700 flex items-center justify-center text-slate-500 text-xs">
        ?
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={nombre}
      width={40}
      height={28}
      className="rounded object-cover w-10 h-7"
      unoptimized
    />
  )
}

export function TarjetaPartido({ partido, onClick }: Props) {
  const pred = partido.prediccion
  const puedePredicir = canPredict(partido)

  return (
    <button
      onClick={onClick}
      disabled={!puedePredicir && !pred}
      className="w-full text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 transition-colors hover:border-slate-600 disabled:opacity-50 disabled:cursor-default"
    >
      {/* Fecha y sede */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatFecha(partido.fecha_hora)} · {formatHora(partido.fecha_hora)}</span>
        {partido.estado === 'en_vivo' && (
          <span className="text-green-400 font-bold animate-pulse">EN VIVO</span>
        )}
        {partido.estado === 'finalizado' && (
          <span className="text-slate-400">Finalizado</span>
        )}
      </div>

      {/* Equipos */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1 flex-1">
          <Bandera src={partido.bandera_local} nombre={partido.equipo_local} />
          <span className="text-xs font-semibold text-white text-center leading-tight">
            {partido.equipo_local}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 px-2">
          {partido.estado === 'finalizado' && partido.resultado_local != null ? (
            <span className="text-xl font-black text-white">
              {partido.resultado_local} - {partido.resultado_visitante}
            </span>
          ) : (
            <span className="text-slate-600 font-bold text-sm">VS</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 flex-1">
          <Bandera src={partido.bandera_visitante} nombre={partido.equipo_visitante} />
          <span className="text-xs font-semibold text-white text-center leading-tight">
            {partido.equipo_visitante}
          </span>
        </div>
      </div>

      {/* Prediccion o CTA */}
      {pred ? (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
          <span className="text-xs text-green-400 font-semibold">Tu predicción</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">
              {pred.goles_local} - {pred.goles_visitante}
            </span>
            <span className="text-yellow-400 text-xs font-semibold">
              {pred.fichas_apostadas} fichas
            </span>
            {puedePredicir && (
              <span className="text-slate-500 text-xs">· Editar</span>
            )}
          </div>
        </div>
      ) : puedePredicir ? (
        <div className="bg-green-500 rounded-xl px-3 py-2 text-center">
          <span className="text-black text-xs font-black uppercase tracking-wide">
            Predecir
          </span>
        </div>
      ) : null}
    </button>
  )
}
