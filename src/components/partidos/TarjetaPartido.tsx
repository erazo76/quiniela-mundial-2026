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

function formatCountdown(fechaHora: string): string | null {
  const limite = new Date(fechaHora).getTime() - 5 * 60 * 1000
  const diff = limite - Date.now()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
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

function badgeResultado(tipoAcierto: string | null, acertado: boolean) {
  if (!tipoAcierto) return null
  if (tipoAcierto === 'exacto')
    return { label: 'EXACTO', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' }
  if (tipoAcierto === 'ganador')
    return { label: 'GANADOR', cls: 'bg-green-500/20 text-green-300 border-green-500/40' }
  if (!acertado)
    return { label: 'FALLO', cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
  return null
}

function cardBorder(tipoAcierto: string | null, acertado: boolean) {
  if (!tipoAcierto) return 'border-slate-800 hover:border-slate-600'
  if (tipoAcierto === 'exacto') return 'border-yellow-500/50'
  if (tipoAcierto === 'ganador') return 'border-green-500/40'
  if (!acertado) return 'border-red-900/40'
  return 'border-slate-800'
}

export function TarjetaPartido({ partido, onClick }: Props) {
  const pred = partido.prediccion
  const puedePredicir = canPredict(partido)
  const badge = pred ? badgeResultado(pred.tipo_acierto, pred.acertado) : null
  const borderCls = pred ? cardBorder(pred.tipo_acierto, pred.acertado) : 'border-slate-800 hover:border-slate-600'

  return (
    <button
      onClick={onClick}
      disabled={!puedePredicir && !pred}
      className={`w-full text-left bg-slate-900 border ${borderCls} rounded-2xl p-4 flex flex-col gap-3 transition-colors disabled:opacity-50 disabled:cursor-default`}
    >
      {/* Fecha y sede */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatFecha(partido.fecha_hora)} · {formatHora(partido.fecha_hora)}{partido.sede ? ` · ${partido.sede}` : ''}</span>
        {partido.estado === 'en_vivo' && (
          <span className="text-green-400 font-bold animate-pulse">EN VIVO</span>
        )}
        {partido.estado === 'finalizado' && (
          <span className="text-slate-400">Finalizado</span>
        )}
        {partido.estado === 'pendiente' && (() => {
          const countdown = formatCountdown(partido.fecha_hora)
          if (!countdown) return null
          const diff = new Date(partido.fecha_hora).getTime() - 5 * 60 * 1000 - Date.now()
          const urgent = diff < 3600000
          return (
            <span className={`font-semibold ${urgent ? 'text-amber-400' : 'text-slate-400'}`}>
              Cierra en {countdown}
            </span>
          )
        })()}
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
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
          badge?.cls
            ? badge.cls.includes('yellow')
              ? 'bg-yellow-500/10 border-yellow-500/25'
              : badge.cls.includes('green')
              ? 'bg-green-500/10 border-green-500/25'
              : badge.cls.includes('red')
              ? 'bg-red-500/10 border-red-500/25'
              : 'bg-green-500/10 border-green-500/20'
            : 'bg-green-500/10 border-green-500/20'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Tu pred.</span>
            <span className="text-white font-bold text-sm">
              {pred.goles_local} - {pred.goles_visitante}
            </span>
            <span className="text-yellow-400 text-xs font-semibold">
              {pred.fichas_apostadas} fichas
            </span>
          </div>
          <div className="flex items-center gap-2">
            {badge ? (
              <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge.cls}`}>
                {badge.label}
              </span>
            ) : puedePredicir ? (
              <span className="text-slate-500 text-xs">Editar</span>
            ) : null}
            {badge?.label === 'EXACTO' && (
              <span className="text-yellow-300 text-xs font-bold">+{pred.ganancia_fichas}</span>
            )}
            {badge?.label === 'GANADOR' && (
              <span className="text-green-300 text-xs font-bold">+{pred.ganancia_fichas}</span>
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
