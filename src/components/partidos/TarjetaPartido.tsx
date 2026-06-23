'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Partido } from '@/types'
import { avatarSrc, getAvatarIndex } from '@/lib/avatar'

interface Props {
  partido: Partido
  ligaTipo?: 'vip' | 'junior'
  ligaId: string
  usuarioId: string
  onClick: () => void
}

interface PrediccionParticipante {
  usuario_id: string
  nombre: string
  goles_local: number
  goles_visitante: number
  fichas_apostadas: number
  tipo_acierto: string | null
  acertado: boolean
  ganancia_fichas: number
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

function badgeAcierto(tipo: string | null, acertado: boolean) {
  if (tipo === 'exacto')  return { label: 'EXACTO',  cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' }
  if (tipo === 'ganador') return { label: 'GANADOR', cls: 'bg-green-500/20 text-green-300 border-green-500/40' }
  if (!acertado && tipo)  return { label: 'FALLO',   cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
  return null
}

function PrediccionesPanel({
  partidoId,
  ligaId,
  usuarioId,
  ligaTipo,
  finalizado,
}: {
  partidoId: string
  ligaId: string
  usuarioId: string
  ligaTipo?: 'vip' | 'junior'
  finalizado: boolean
}) {
  const [predicciones, setPredicciones] = useState<PrediccionParticipante[] | null>(null)
  const [bloqueado, setBloqueado] = useState(false)
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    // Refresca al abrir para reflejar predicciones recién hechas (carga on-demand).
    if (!abierto) {
      setCargando(true)
      fetch(`/api/predicciones-partido?partido_id=${partidoId}&liga_id=${ligaId}&usuario_id=${usuarioId}`)
        .then((r) => r.json())
        .then((data) => {
          setPredicciones(Array.isArray(data?.predicciones) ? data.predicciones : [])
          setBloqueado(!!data?.bloqueado)
          setTotal(typeof data?.total === 'number' ? data.total : 0)
        })
        .catch(() => {
          setPredicciones([])
          setBloqueado(false)
          setTotal(0)
        })
        .finally(() => setCargando(false))
    }
    setAbierto((v) => !v)
  }

  return (
    <div className="border-t border-slate-800/60 mt-1">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-1 py-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
      >
        <span className="font-semibold uppercase tracking-wide">
          Predicciones del grupo
        </span>
        <span className={`transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {abierto && (
        <div className="pb-2 flex flex-col gap-1.5">
          {cargando ? (
            <div className="flex flex-col gap-1.5 px-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : bloqueado ? (
            <p className="text-[11px] text-slate-500 text-center py-2 px-2 leading-relaxed">
              🔒 Las predicciones del grupo se revelan 5 min antes del partido, cuando ya nadie puede editar
              {total > 0 && (
                <span className="block text-slate-600 mt-0.5">
                  {total} {total === 1 ? 'participante ya predijo' : 'participantes ya predijeron'}
                </span>
              )}
            </p>
          ) : !predicciones?.length ? (
            <p className="text-[11px] text-slate-600 text-center py-2">
              Ningún participante predijo este partido
            </p>
          ) : (
            predicciones.map((p) => {
              const esYo = p.usuario_id === usuarioId
              const badge = finalizado ? badgeAcierto(p.tipo_acierto, p.acertado) : null
              return (
                <div
                  key={p.usuario_id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${
                    esYo ? 'bg-green-500/10 border border-green-500/20' : 'bg-slate-800/50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                    <Image
                      src={avatarSrc(getAvatarIndex(p.usuario_id, p.nombre))}
                      alt={p.nombre}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Nombre */}
                  <span className={`text-xs font-semibold flex-1 truncate ${esYo ? 'text-green-300' : 'text-slate-300'}`}>
                    {p.nombre}{esYo ? ' (tú)' : ''}
                  </span>

                  {/* Prediccion */}
                  <span className="text-xs font-black text-white shrink-0">
                    {p.goles_local} - {p.goles_visitante}
                  </span>

                  {/* Fichas apostadas (solo master) */}
                  {ligaTipo !== 'junior' && (
                    <span className="text-[10px] text-yellow-400 font-semibold shrink-0">
                      {p.fichas_apostadas}f
                    </span>
                  )}

                  {/* Badge resultado */}
                  {badge && (
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}

                  {/* Puntos/ganancia */}
                  {finalizado && p.tipo_acierto && (
                    <span className={`text-[10px] font-black shrink-0 ${p.tipo_acierto === 'exacto' ? 'text-yellow-300' : p.tipo_acierto === 'ganador' ? 'text-green-300' : 'text-red-400'}`}>
                      {ligaTipo === 'junior'
                        ? `+${p.tipo_acierto === 'exacto' ? 3 : p.tipo_acierto === 'ganador' ? 2 : 0}`
                        : `+${p.ganancia_fichas}`}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export function TarjetaPartido({ partido, ligaTipo, ligaId, usuarioId, onClick }: Props) {
  const pred = partido.prediccion
  const puedePredicir = canPredict(partido)
  const badge = pred ? badgeResultado(pred.tipo_acierto, pred.acertado) : null
  const borderCls = pred ? cardBorder(pred.tipo_acierto, pred.acertado) : 'border-slate-800 hover:border-slate-600'
  // Transparencia total: las predicciones del grupo se ven en todo momento, desde
  // que se hace cada predicción (no solo al cerrar/finalizar el partido).
  const mostrarTransparencia = true

  return (
    <div className={`w-full bg-slate-900 border ${borderCls} rounded-2xl overflow-hidden transition-colors`}>
      {/* Zona clickeable del partido */}
      <button
        onClick={onClick}
        disabled={!puedePredicir && !pred}
        className="w-full text-left p-4 flex flex-col gap-3 disabled:opacity-50 disabled:cursor-default"
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
              {ligaTipo !== 'junior' && (
                <span className="text-yellow-400 text-xs font-semibold">
                  {pred.fichas_apostadas} fichas
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {badge ? (
                <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge.cls}`}>
                  {badge.label}
                </span>
              ) : puedePredicir ? (
                <Image src="/ui/icon-edit.png" alt="Editar" width={18} height={18} unoptimized className="opacity-50" />
              ) : null}
              {badge?.label === 'EXACTO' && (
                <span className="text-yellow-300 text-xs font-bold">
                  +{ligaTipo === 'junior' ? 3 : pred.ganancia_fichas}
                  {ligaTipo === 'junior' ? ' pts' : ''}
                </span>
              )}
              {badge?.label === 'GANADOR' && (
                <span className="text-green-300 text-xs font-bold">
                  +{ligaTipo === 'junior' ? 2 : pred.ganancia_fichas}
                  {ligaTipo === 'junior' ? ' pts' : ''}
                </span>
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

      {/* Panel de transparencia — visible cuando ya no se puede predecir */}
      {mostrarTransparencia && (
        <div className="px-3 pb-1">
          <PrediccionesPanel
            partidoId={partido.id}
            ligaId={ligaId}
            usuarioId={usuarioId}
            ligaTipo={ligaTipo}
            finalizado={partido.estado === 'finalizado'}
          />
        </div>
      )}
    </div>
  )
}
