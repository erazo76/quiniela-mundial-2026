'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ADMIN_TOKEN_KEY = 'qm2026_admin_token'

interface Miembro {
  id: string
  nombre: string
  fichas: number
  racha: number
  tienePin: boolean
  bono_usado: boolean
}

interface Liga {
  id: string
  nombre_liga: string
  codigo_invitacion: string
  created_at: string
  miembros: Miembro[]
}

function FilaMiembro({
  miembro,
  token,
}: {
  miembro: Miembro
  token: string
}) {
  const [reseteando, setReseteando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null)

  async function resetearPin() {
    setReseteando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, usuarioId: miembro.id }),
      })
      const data = await res.json()
      setMsg({ texto: res.ok ? 'PIN reseteado' : (data.error ?? 'Error'), ok: res.ok })
    } catch {
      setMsg({ texto: 'Error de conexión', ok: false })
    } finally {
      setReseteando(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-black text-white shrink-0">
          {miembro.nombre[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{miembro.nombre}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{miembro.fichas} fichas</span>
            {miembro.racha >= 3 && (
              <span className="text-xs text-amber-400">🔥 {miembro.racha}</span>
            )}
            {!miembro.tienePin && (
              <span className="text-xs text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">Sin PIN</span>
            )}
            {miembro.bono_usado && (
              <span className="text-xs text-slate-600">bono usado</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {msg && (
          <span className={`text-xs font-semibold ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>
            {msg.texto}
          </span>
        )}
        <button
          onClick={resetearPin}
          disabled={reseteando || !miembro.tienePin}
          title={miembro.tienePin ? 'Resetear PIN' : 'No tiene PIN configurado'}
          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-slate-300 font-semibold rounded-lg transition-colors"
        >
          {reseteando ? '...' : 'Reset PIN'}
        </button>
      </div>
    </div>
  )
}

function TarjetaLiga({ liga, token }: { liga: Liga; token: string }) {
  const [expandida, setExpandida] = useState(false)

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpandida(!expandida)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-800/40 transition-colors"
      >
        <div className="text-left">
          <p className="text-base font-bold text-white">{liga.nombre_liga}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-sm font-mono font-bold text-green-400 tracking-widest">
              {liga.codigo_invitacion}
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-500">
              {liga.miembros.length} miembro{liga.miembros.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-500">{formatFecha(liga.created_at)}</span>
          </div>
        </div>
        <span className={`text-slate-500 text-sm transition-transform ${expandida ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {expandida && (
        <div className="border-t border-slate-800 px-2 py-2">
          {liga.miembros.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-4">Sin miembros aún</p>
          ) : (
            liga.miembros.map((m) => (
              <FilaMiembro key={m.id} miembro={m} token={token} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminLigasPage() {
  const [ligas, setLigas] = useState<Liga[]>([])
  const [cargando, setCargando] = useState(true)
  const [token, setToken] = useState('')
  const router = useRouter()

  const cargarLigas = useCallback(async (t: string) => {
    const res = await fetch('/api/admin/ligas', { headers: { 'x-admin-token': t } })
    if (!res.ok) { router.replace('/admin'); return }
    setLigas(await res.json())
    setCargando(false)
  }, [router])

  useEffect(() => {
    const t = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (!t) { router.replace('/admin'); return }
    setToken(t)
    cargarLigas(t)
  }, [router, cargarLigas])

  function salir() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    router.push('/admin')
  }

  const totalMiembros = ligas.reduce((acc, l) => acc + l.miembros.length, 0)
  const sinPin = ligas.reduce((acc, l) => acc + l.miembros.filter((m) => !m.tienePin).length, 0)

  return (
    <main className="min-h-screen text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Admin</p>
          <h1 className="text-base font-black text-white">Quiniela Mundial 2026</h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{ligas.length} ligas · {totalMiembros} miembros</span>
          {sinPin > 0 && (
            <span className="text-amber-500">{sinPin} sin PIN</span>
          )}
          <button onClick={salir} className="text-red-400 hover:text-red-300 transition-colors font-semibold">
            Salir
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav className="flex gap-1 px-4 py-3 border-b border-slate-800">
        <Link
          href="/admin/partidos"
          className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
        >
          Partidos
        </Link>
        <Link
          href="/admin/ligas"
          className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-green-500 text-black"
        >
          Ligas
        </Link>
      </nav>

      {/* Lista */}
      <div className="px-4 py-4 flex flex-col gap-3 max-w-2xl mx-auto">
        {cargando ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-900 rounded-2xl animate-pulse" />
          ))
        ) : ligas.length === 0 ? (
          <p className="text-slate-600 text-center py-8 text-sm">No hay ligas creadas</p>
        ) : (
          ligas.map((liga) => (
            <TarjetaLiga key={liga.id} liga={liga} token={token} />
          ))
        )}
      </div>
    </main>
  )
}
