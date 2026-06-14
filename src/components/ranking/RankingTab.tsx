'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { avatarSrc, getAvatarIndex } from '@/lib/avatar'
import { createClient } from '@/lib/supabase/client'

const COMISION = 0.05
const DISTRIBUCION = [
  { label: '1er lugar', pct: 0.60, color: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/5' },
  { label: '2do lugar', pct: 0.25, color: 'text-slate-300',  border: 'border-slate-500/30',  bg: 'bg-slate-800/40' },
  { label: '3er lugar', pct: 0.15, color: 'text-orange-400', border: 'border-orange-700/40', bg: 'bg-orange-700/5' },
]

const MEDALLAS_IMG = [
  '/ui/BrainMedal1st.png',
  '/ui/BrainMedal2nd.png',
  '/ui/BrainMedal3rd.png',
]
const COLORES_PODIO = [
  'border-yellow-500/60 bg-yellow-500/5',
  'border-slate-400/40 bg-slate-400/5',
  'border-orange-700/50 bg-orange-700/5',
]
const COLORES_FICHAS = ['text-yellow-400', 'text-slate-300', 'text-orange-400']

interface EntradaRanking {
  posicion: number
  medalla: number | null
  id: string
  nombre: string
  fichas: number
  racha: number
  bono_usado: boolean
  predicciones_total: number
  predicciones_acertadas: number
  partidos_finalizados: number
  es_espectador: boolean
}

interface ItemHistorial {
  partido_id: string
  equipo_local: string
  equipo_visitante: string
  bandera_local: string | null
  bandera_visitante: string | null
  resultado_local: number | null
  resultado_visitante: number | null
  goles_local: number
  goles_visitante: number
  fichas_apostadas: number
  tipo_acierto: string | null
  acertado: boolean
  ganancia_fichas: number
}

interface Props {
  ligaId: string
  usuarioId: string
  ligaTipo: 'vip' | 'junior'
}

function FireBadge({ racha }: { racha: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-yellow-400 font-bold">
      <Image src="/ui/fire.png" alt="racha" width={14} height={14} unoptimized />
      {racha}
    </span>
  )
}

function SeccionPote({ pote, ranking }: { pote: number; ranking: EntradaRanking[] }) {
  const top3 = ranking.filter(e => !e.es_espectador).slice(0, 3)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Image src="/ui/icon-coins.png" alt="pote" width={18} height={18} unoptimized className="opacity-80" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pote</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-yellow-400">{pote.toLocaleString()}</span>
          <span className="text-xs text-slate-500">fichas</span>
        </div>
      </div>

      <div className="divide-y divide-slate-800/60">
        {DISTRIBUCION.map((d, i) => {
          const premio = Math.floor(pote * d.pct)
          const jugador = top3[i]
          return (
            <div key={d.label} className={`flex items-center gap-3 px-4 py-3 ${d.bg}`}>
              <Image src={MEDALLAS_IMG[i]} alt={d.label} width={20} height={20} unoptimized className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider leading-none mb-0.5">{d.label}</p>
                {jugador ? (
                  <p className="text-sm font-bold text-white truncate">{jugador.nombre}</p>
                ) : (
                  <p className="text-sm text-slate-600 italic">Sin definir</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className={`text-base font-black ${d.color}`}>{premio.toLocaleString()}</p>
                <p className="text-[10px] text-slate-600">{Math.round(d.pct * 100)}%</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-2 border-t border-slate-800/60">
        <p className="text-[10px] text-slate-600 text-center">
          {Math.round(COMISION * 100)}% de cada apuesta va al pote · Premio referencial
        </p>
      </div>
    </div>
  )
}

function HistorialPanel({
  usuarioId,
  ligaId,
  esJunior,
}: {
  usuarioId: string
  ligaId: string
  esJunior: boolean
}) {
  const [items, setItems] = useState<ItemHistorial[] | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    setCargando(true)
    fetch(`/api/historial-predicciones?usuario_id=${usuarioId}&liga_id=${ligaId}`)
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setCargando(false))
  }, [usuarioId, ligaId])

  if (cargando) {
    return (
      <div className="flex flex-col gap-1 mt-2 px-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!items?.length) {
    return (
      <p className="text-[11px] text-slate-600 text-center py-2 mt-1">
        Sin predicciones en partidos finalizados
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1 mt-2">
      {items.map((item) => {
        const ptsBadge =
          item.tipo_acierto === 'exacto'  ? { label: 'EXACTO',  pts: esJunior ? 3 : item.ganancia_fichas, cls: 'text-yellow-300' } :
          item.tipo_acierto === 'ganador' ? { label: 'GANADOR', pts: esJunior ? 2 : item.ganancia_fichas, cls: 'text-green-300'  } :
          item.acertado                  ? { label: 'OK',       pts: esJunior ? 2 : item.ganancia_fichas, cls: 'text-green-300'  } :
                                           { label: 'FALLO',    pts: 0,                                    cls: 'text-red-400'   }

        return (
          <div
            key={item.partido_id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-800/50"
          >
            {/* Banderas */}
            <div className="flex items-center gap-0.5 shrink-0">
              {item.bandera_local && (
                <Image src={item.bandera_local} alt={item.equipo_local} width={18} height={13} className="rounded-sm object-cover" unoptimized />
              )}
              {item.bandera_visitante && (
                <Image src={item.bandera_visitante} alt={item.equipo_visitante} width={18} height={13} className="rounded-sm object-cover" unoptimized />
              )}
            </div>

            {/* Partido */}
            <span className="text-[10px] text-slate-400 flex-1 truncate">
              {item.equipo_local} vs {item.equipo_visitante}
            </span>

            {/* Resultado real */}
            {item.resultado_local != null && (
              <span className="text-[10px] text-slate-500 shrink-0">
                {item.resultado_local}-{item.resultado_visitante}
              </span>
            )}

            {/* Prediccion */}
            <span className="text-[10px] font-bold text-white shrink-0">
              {item.goles_local}-{item.goles_visitante}
            </span>

            {/* Tipo + puntos */}
            <span className={`text-[10px] font-black shrink-0 ${ptsBadge.cls}`}>
              {ptsBadge.label} {ptsBadge.pts > 0 ? `+${ptsBadge.pts}` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function FilaPodio({
  entrada,
  esYo,
  esJunior,
  ligaId,
}: {
  entrada: EntradaRanking
  esYo: boolean
  esJunior: boolean
  ligaId: string
}) {
  const idx = (entrada.medalla ?? entrada.posicion) - 1
  const [abierto, setAbierto] = useState(false)

  return (
    <div
      className={`flex flex-col rounded-2xl border ${COLORES_PODIO[idx]} ${
        esYo ? 'ring-2 ring-green-500/40' : ''
      }`}
    >
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex flex-col items-center gap-2 p-4 w-full"
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800">
            <Image src={avatarSrc(getAvatarIndex(entrada.id, entrada.nombre))} alt={entrada.nombre} width={48} height={48} className="w-full h-full object-cover" />
          </div>
          <Image src={MEDALLAS_IMG[idx]} alt={`${entrada.medalla ?? entrada.posicion}°`} width={22} height={22} unoptimized className="absolute -bottom-1 -right-1" />
        </div>
        <p className="text-xs text-slate-400 font-semibold text-center truncate w-full">
          {entrada.nombre}
          {esYo && <span className="ml-1 text-green-400">(tú)</span>}
        </p>
        <p className={`text-xl font-black ${COLORES_FICHAS[idx]}`}>
          {entrada.fichas.toLocaleString()}
          <span className="text-xs font-normal ml-1">{esJunior ? 'pts' : ''}</span>
        </p>
        <p className="text-xs text-slate-600">{entrada.predicciones_total} predicciones</p>
        {!esJunior && entrada.racha >= 3 && <FireBadge racha={entrada.racha} />}
        <span className={`text-[10px] text-slate-500 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {abierto && (
        <div className="px-3 pb-3 border-t border-slate-800/40">
          <HistorialPanel usuarioId={entrada.id} ligaId={ligaId} esJunior={esJunior} />
        </div>
      )}
    </div>
  )
}

function FilaLista({
  entrada,
  esYo,
  esJunior,
  ligaId,
}: {
  entrada: EntradaRanking
  esYo: boolean
  esJunior: boolean
  ligaId: string
}) {
  const esEspectador = entrada.es_espectador
  const [abierto, setAbierto] = useState(false)

  return (
    <div
      className={`flex flex-col rounded-2xl border transition-colors ${
        esEspectador
          ? 'border-slate-800/50 bg-slate-900/50 opacity-60'
          : esYo
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <button
        onClick={() => !esEspectador && setAbierto((v) => !v)}
        className={`flex items-center gap-3 px-4 py-3 w-full text-left ${esEspectador ? 'cursor-default' : ''}`}
      >
        {esEspectador
          ? <span className="text-slate-600 font-bold w-5 text-center text-sm shrink-0">—</span>
          : entrada.medalla != null
          ? <Image src={MEDALLAS_IMG[entrada.medalla - 1]} alt={`${entrada.medalla}°`} width={22} height={22} unoptimized className="shrink-0" />
          : <span className="text-slate-500 font-bold w-5 text-center text-sm shrink-0">{entrada.posicion}</span>
        }
        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
          <Image src={avatarSrc(getAvatarIndex(entrada.id, entrada.nombre))} alt={entrada.nombre} width={32} height={32} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${esEspectador ? 'text-slate-500' : 'text-white'}`}>
            {entrada.nombre}
            {esYo && <span className="ml-2 text-xs text-green-400 font-normal">(tú)</span>}
          </p>
          <p className="text-xs text-slate-600">
            {esEspectador
              ? `${entrada.predicciones_total}/${entrada.partidos_finalizados} predicciones · Sin participar`
              : `${entrada.predicciones_total} pred.${entrada.predicciones_acertadas > 0 ? ` · ${entrada.predicciones_acertadas} acertadas` : ''}`
            }
          </p>
        </div>
        {!esJunior && !esEspectador && entrada.racha >= 3 && <FireBadge racha={entrada.racha} />}
        <span className={`font-black text-sm ${esEspectador ? 'text-slate-500' : 'text-yellow-400'}`}>
          {entrada.fichas.toLocaleString()}{esJunior && !esEspectador ? ' pts' : ''}
        </span>
        {!esEspectador && (
          <span className={`text-[11px] text-slate-500 ml-1 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▾</span>
        )}
      </button>

      {abierto && !esEspectador && (
        <div className="px-4 pb-3 border-t border-slate-800/40">
          <HistorialPanel usuarioId={entrada.id} ligaId={ligaId} esJunior={esJunior} />
        </div>
      )}
    </div>
  )
}

export function RankingTab({ ligaId, usuarioId, ligaTipo }: Props) {
  const esJunior = ligaTipo === 'junior'
  const [ranking, setRanking] = useState<EntradaRanking[]>([])
  const [pote, setPote] = useState(0)
  const [cargando, setCargando] = useState(true)
  const supabaseRef = useRef(createClient())

  const fetchRanking = () => {
    fetch(`/api/ranking?liga_id=${ligaId}`)
      .then((r) => r.json())
      .then((data) => {
        setRanking(Array.isArray(data.ranking) ? data.ranking : [])
        setPote(data.pote ?? 0)
      })
      .catch(() => {})
  }

  useEffect(() => {
    setCargando(true)
    fetch(`/api/ranking?liga_id=${ligaId}`)
      .then((r) => r.json())
      .then((data) => {
        setRanking(Array.isArray(data.ranking) ? data.ranking : [])
        setPote(data.pote ?? 0)
      })
      .finally(() => setCargando(false))
  }, [ligaId])

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`ranking-${ligaId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'usuarios', filter: `liga_id=eq.${ligaId}`
      }, fetchRanking)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligaId])

  const activos      = ranking.filter(e => !e.es_espectador)
  const espectadores = ranking.filter(e => e.es_espectador)
  // Podio = quienes tienen medalla (oro/plata pueden compartirse en empate)
  const podio = activos.filter(e => e.medalla != null)
  const resto = activos.filter(e => e.medalla == null)

  if (cargando) {
    return (
      <div className="flex-1 flex flex-col gap-3 px-4 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-900 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!ranking.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
        Aún no hay participantes en esta liga
      </div>
    )
  }

  const hayEmpatesPodio = esJunior && activos.length >= 2 && (
    (activos[0]?.fichas === activos[1]?.fichas) ||
    (activos[1]?.fichas === activos[2]?.fichas)
  )

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-4">
      {/* Pote (solo MASTER) */}
      {!esJunior && <SeccionPote pote={pote} ranking={ranking} />}

      {/* Nota JUNIOR */}
      {esJunior && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3 flex flex-col gap-1">
          <p className="text-xs font-black text-blue-300 uppercase tracking-wide">Liga JUNIOR · Ranking por puntos</p>
          <p className="text-[11px] text-blue-200/70 leading-snug">
            Exacto = 3 pts · Ganador/empate correcto = 2 pts · Fallo = 0 pts
          </p>
          {hayEmpatesPodio && (
            <p className="text-[11px] text-blue-200/50 leading-snug mt-0.5">
              Hay empate en el podio — cualquier premio acordado se dividirá entre quienes compartan esa posición.
            </p>
          )}
        </div>
      )}

      {/* Clasificacion */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/ui/icon-trophy-nav.png" alt="Clasificación" width={20} height={20} className="opacity-80" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Clasificación
          </h2>
        </div>
        <span className="text-xs text-slate-600">{ranking.length} participantes · toca para ver historial</span>
      </div>

      {/* Podio */}
      {podio.length > 0 && (
        <div
          className={`grid gap-3 ${
            podio.length === 1
              ? 'grid-cols-1'
              : podio.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-3'
          }`}
        >
          {podio.map((entrada) => (
            <FilaPodio
              key={entrada.id}
              entrada={entrada}
              esYo={entrada.id === usuarioId}
              esJunior={esJunior}
              ligaId={ligaId}
            />
          ))}
        </div>
      )}

      {/* Resto activos */}
      {resto.length > 0 && (
        <div className="flex flex-col gap-2">
          {resto.map((entrada) => (
            <FilaLista
              key={entrada.id}
              entrada={entrada}
              esYo={entrada.id === usuarioId}
              esJunior={esJunior}
              ligaId={ligaId}
            />
          ))}
        </div>
      )}

      {/* Espectadores */}
      {espectadores.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">
              Sin participación mínima
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          {espectadores.map((entrada) => (
            <FilaLista
              key={entrada.id}
              entrada={entrada}
              esYo={entrada.id === usuarioId}
              esJunior={esJunior}
              ligaId={ligaId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
