'use client'
import { useEffect, useState } from 'react'

interface EntradaRanking {
  posicion: number
  id: string
  nombre: string
  fichas: number
  racha: number
  predicciones_total: number
  predicciones_acertadas: number
}

interface Props {
  ligaId: string
  usuarioId: string
}

const MEDALLAS = ['🥇', '🥈', '🥉']
const COLORES_PODIO = [
  'border-yellow-500/60 bg-yellow-500/5',
  'border-slate-400/40 bg-slate-400/5',
  'border-orange-700/50 bg-orange-700/5',
]
const COLORES_FICHAS = ['text-yellow-400', 'text-slate-300', 'text-orange-400']

function FilaPodio({ entrada, esYo }: { entrada: EntradaRanking; esYo: boolean }) {
  const idx = entrada.posicion - 1
  return (
    <div
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${COLORES_PODIO[idx]} ${
        esYo ? 'ring-2 ring-green-500/40' : ''
      }`}
    >
      <span className="text-3xl">{MEDALLAS[idx]}</span>
      <p className="text-xs text-slate-400 font-semibold text-center truncate w-full text-center">
        {entrada.nombre}
        {esYo && <span className="ml-1 text-green-400">(tú)</span>}
      </p>
      <p className={`text-xl font-black ${COLORES_FICHAS[idx]}`}>
        {entrada.fichas.toLocaleString()}
      </p>
      <p className="text-xs text-slate-600">{entrada.predicciones_total} predicciones</p>
      {entrada.racha >= 3 && (
        <span className="text-xs text-yellow-400 font-bold">🔥 Racha {entrada.racha}</span>
      )}
    </div>
  )
}

function FilaLista({ entrada, esYo }: { entrada: EntradaRanking; esYo: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
        esYo
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <span className="text-slate-500 font-bold w-6 text-center text-sm">
        {entrada.posicion}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">
          {entrada.nombre}
          {esYo && <span className="ml-2 text-xs text-green-400 font-normal">(tú)</span>}
        </p>
        <p className="text-xs text-slate-600">
          {entrada.predicciones_total} predicciones
          {entrada.predicciones_acertadas > 0 &&
            ` · ${entrada.predicciones_acertadas} acertadas`}
        </p>
      </div>
      {entrada.racha >= 3 && (
        <span className="text-xs text-yellow-400">🔥{entrada.racha}</span>
      )}
      <span className="text-yellow-400 font-black text-sm">
        {entrada.fichas.toLocaleString()}
      </span>
    </div>
  )
}

export function RankingTab({ ligaId, usuarioId }: Props) {
  const [ranking, setRanking] = useState<EntradaRanking[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    fetch(`/api/ranking?liga_id=${ligaId}`)
      .then((r) => r.json())
      .then((data) => setRanking(Array.isArray(data) ? data : []))
      .finally(() => setCargando(false))
  }, [ligaId])

  const podio = ranking.slice(0, 3)
  const resto = ranking.slice(3)

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
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Clasificación
        </h2>
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

      {/* Resto */}
      {resto.length > 0 && (
        <div className="flex flex-col gap-2">
          {resto.map((entrada) => (
            <FilaLista key={entrada.id} entrada={entrada} esYo={entrada.id === usuarioId} />
          ))}
        </div>
      )}
    </div>
  )
}
