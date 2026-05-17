'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { avatarSrc, getAvatarIndex } from '@/lib/avatar'

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

interface Props {
  ligaId: string
  usuarioId: string
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
      {/* Encabezado del pote */}
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

      {/* Filas de distribución */}
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

      {/* Nota comision */}
      <div className="px-4 py-2 border-t border-slate-800/60">
        <p className="text-[10px] text-slate-600 text-center">
          {Math.round(COMISION * 100)}% de cada apuesta va al pote · Premio referencial
        </p>
      </div>
    </div>
  )
}

function FilaPodio({ entrada, esYo }: { entrada: EntradaRanking; esYo: boolean }) {
  const idx = entrada.posicion - 1
  return (
    <div
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${COLORES_PODIO[idx]} ${
        esYo ? 'ring-2 ring-green-500/40' : ''
      }`}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800">
          <Image src={avatarSrc(getAvatarIndex(entrada.id, entrada.nombre))} alt={entrada.nombre} width={48} height={48} className="w-full h-full object-cover" />
        </div>
        <Image src={MEDALLAS_IMG[idx]} alt={`${entrada.posicion}°`} width={22} height={22} unoptimized className="absolute -bottom-1 -right-1" />
      </div>
      <p className="text-xs text-slate-400 font-semibold text-center truncate w-full text-center">
        {entrada.nombre}
        {esYo && <span className="ml-1 text-green-400">(tú)</span>}
      </p>
      <p className={`text-xl font-black ${COLORES_FICHAS[idx]}`}>
        {entrada.fichas.toLocaleString()}
      </p>
      <p className="text-xs text-slate-600">{entrada.predicciones_total} predicciones</p>
      {entrada.racha >= 3 && <FireBadge racha={entrada.racha} />}
    </div>
  )
}

function FilaLista({ entrada, esYo }: { entrada: EntradaRanking; esYo: boolean }) {
  const esEspectador = entrada.es_espectador
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
        esEspectador
          ? 'border-slate-800/50 bg-slate-900/50 opacity-60'
          : esYo
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      {esEspectador
        ? <span className="text-slate-600 font-bold w-5 text-center text-sm shrink-0">—</span>
        : entrada.posicion <= 3
        ? <Image src={MEDALLAS_IMG[entrada.posicion - 1]} alt={`${entrada.posicion}°`} width={22} height={22} unoptimized className="shrink-0" />
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
            : `${entrada.predicciones_total} predicciones${entrada.predicciones_acertadas > 0 ? ` · ${entrada.predicciones_acertadas} acertadas` : ''}`
          }
        </p>
      </div>
      {!esEspectador && entrada.racha >= 3 && <FireBadge racha={entrada.racha} />}
      <span className={`font-black text-sm ${esEspectador ? 'text-slate-500' : 'text-yellow-400'}`}>
        {entrada.fichas.toLocaleString()}
      </span>
    </div>
  )
}

export function RankingTab({ ligaId, usuarioId }: Props) {
  const [ranking, setRanking] = useState<EntradaRanking[]>([])
  const [pote, setPote] = useState(0)
  const [cargando, setCargando] = useState(true)

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

  const activos      = ranking.filter(e => !e.es_espectador)
  const espectadores = ranking.filter(e => e.es_espectador)
  const podio = activos.slice(0, 3)
  const resto = activos.slice(3)

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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-4">
      {/* Pote */}
      <SeccionPote pote={pote} ranking={ranking} />

      {/* Clasificacion */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/ui/icon-trophy-nav.png" alt="Clasificación" width={20} height={20} className="opacity-80" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Clasificación
          </h2>
        </div>
        <span className="text-xs text-slate-600">{ranking.length} participantes</span>
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
            <FilaPodio key={entrada.id} entrada={entrada} esYo={entrada.id === usuarioId} />
          ))}
        </div>
      )}

      {/* Resto activos */}
      {resto.length > 0 && (
        <div className="flex flex-col gap-2">
          {resto.map((entrada) => (
            <FilaLista key={entrada.id} entrada={entrada} esYo={entrada.id === usuarioId} />
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
            <FilaLista key={entrada.id} entrada={entrada} esYo={entrada.id === usuarioId} />
          ))}
        </div>
      )}
    </div>
  )
}
