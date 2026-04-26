'use client'
import { useEffect, useState } from 'react'
import { Session } from '@/lib/session'

interface Stats {
  fichas: number
  racha: number
  bono_usado: boolean
  predicciones_total: number
  predicciones_acertadas: number
}

interface Props {
  session: Session
  fichas: number
  onLogout: () => void
  onVerTutorial: () => void
}

function Stat({ label, valor, sub }: { label: string; valor: string | number; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4">
      <span className="text-2xl font-black text-white">{valor}</span>
      <span className="text-xs text-slate-500 uppercase tracking-wide text-center">{label}</span>
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
    </div>
  )
}

export function PerfilTab({ session, fichas, onLogout, onVerTutorial }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    fetch(`/api/usuario?id=${session.usuarioId}`)
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
  }, [session.usuarioId])

  function copiarCodigo() {
    navigator.clipboard.writeText(session.codigoInvitacion).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  const iniciales = session.nombre
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
      {/* Avatar y nombre */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
          <span className="text-3xl font-black text-green-400">{iniciales}</span>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-white uppercase">{session.nombre}</h2>
          <p className="text-slate-500 text-sm">{session.ligaNombre}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Fichas" valor={fichas.toLocaleString()} />
        <Stat
          label="Racha actual"
          valor={stats?.racha ?? 0}
          sub={stats && stats.racha >= 3 ? '🔥 Racha de oro' : undefined}
        />
        <Stat label="Predicciones" valor={stats?.predicciones_total ?? 0} />
        <Stat
          label="Acertadas"
          valor={stats?.predicciones_acertadas ?? 0}
          sub={
            stats && stats.predicciones_total > 0
              ? `${Math.round((stats.predicciones_acertadas / stats.predicciones_total) * 100)}%`
              : undefined
          }
        />
      </div>

      {/* Bono de rescate */}
      <div
        className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
          stats?.bono_usado
            ? 'border-slate-800 bg-slate-900'
            : 'border-green-500/30 bg-green-500/5'
        }`}
      >
        <div>
          <p className="text-sm font-bold text-white">Bono de rescate</p>
          <p className="text-xs text-slate-500">300 fichas si llegas a 0</p>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            stats?.bono_usado
              ? 'bg-slate-800 text-slate-500'
              : 'bg-green-500/20 text-green-400'
          }`}
        >
          {stats?.bono_usado ? 'Usado' : 'Disponible'}
        </span>
      </div>

      {/* Código de liga */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
          Código de invitación
        </p>
        <button
          onClick={copiarCodigo}
          className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl px-4 py-3 transition-colors"
        >
          <span className="text-2xl font-black tracking-widest text-green-400 font-mono">
            {session.codigoInvitacion}
          </span>
          <span className="text-xs text-slate-500">
            {copiado ? '✓ Copiado' : 'Copiar'}
          </span>
        </button>
        <p className="text-xs text-slate-600">
          Comparte este código para que otros se unan a tu liga
        </p>
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={onVerTutorial}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold uppercase tracking-wide rounded-2xl transition-colors"
        >
          Ver tutorial
        </button>
        <button
          onClick={onLogout}
          className="w-full py-3 text-red-400 hover:text-red-300 text-sm font-bold uppercase tracking-wide rounded-2xl border border-red-900/40 hover:border-red-700/40 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
