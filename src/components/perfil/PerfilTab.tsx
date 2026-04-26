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

  function compartirWhatsApp() {
    const url = `${window.location.origin}/unirme`
    const texto = `¡Únete a mi liga "${session.ligaNombre}" en Quiniela Mundial 2026! 🏆\nCódigo: *${session.codigoInvitacion}*\nEntra aquí: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  async function compartirNativo() {
    const url = `${window.location.origin}/unirme`
    const texto = `¡Únete a mi liga "${session.ligaNombre}" en Quiniela Mundial 2026! Código: ${session.codigoInvitacion} - ${url}`
    if (navigator.share) {
      await navigator.share({ title: 'Quiniela Mundial 2026', text: texto, url })
    } else {
      compartirWhatsApp()
    }
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

      {/* Invitar amigos */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
          Invitar amigos
        </p>

        {/* Código grande */}
        <button
          onClick={copiarCodigo}
          className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl px-4 py-3 transition-colors"
        >
          <span className="text-2xl font-black tracking-widest text-green-400 font-mono">
            {session.codigoInvitacion}
          </span>
          <span className="text-xs text-slate-500">
            {copiado ? '✓ Copiado' : 'Copiar código'}
          </span>
        </button>

        {/* Botones de compartir */}
        <div className="flex gap-2">
          <button
            onClick={compartirWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 active:scale-95 text-white text-sm font-bold rounded-2xl transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>
          <button
            onClick={compartirNativo}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-sm font-bold rounded-2xl transition-all"
          >
            Compartir link
          </button>
        </div>
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
