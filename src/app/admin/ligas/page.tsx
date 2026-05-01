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

interface PremioPote {
  nombre: string
  label: string
  monto: number
}

interface Liga {
  id: string
  nombre_liga: string
  codigo_invitacion: string
  created_at: string
  miembros: Miembro[]
  pote_virtual?: number
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

function TarjetaLiga({ liga, token, onEliminada }: { liga: Liga; token: string; onEliminada: (id: string) => void }) {
  const [expandida, setExpandida] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [distribuyendo, setDistribuyendo] = useState(false)
  const [distribucion, setDistribucion] = useState<PremioPote[] | null>(null)
  const [confirmPote, setConfirmPote] = useState(false)

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  async function distribuirPote() {
    setDistribuyendo(true)
    try {
      const res = await fetch('/api/admin/ligas/cerrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ligaId: liga.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al distribuir'); return }
      setDistribucion(data.distribucion)
      setConfirmPote(false)
    } catch {
      setError('Error de conexión')
    } finally {
      setDistribuyendo(false)
    }
  }

  async function eliminar() {
    setEliminando(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ligas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ligaId: liga.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al eliminar'); setEliminando(false); return }
      onEliminada(liga.id)
    } catch {
      setError('Error de conexión')
      setEliminando(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center">
        <button
          onClick={() => setExpandida(!expandida)}
          className="flex-1 flex items-center justify-between px-4 py-4 hover:bg-slate-800/40 transition-colors text-left"
        >
          <div>
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
          <span className={`text-slate-500 text-sm transition-transform mr-2 ${expandida ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
        <button
          onClick={() => { setConfirmando(true); setError(null) }}
          className="px-4 py-4 text-slate-600 hover:text-red-400 transition-colors"
          title="Eliminar liga"
        >
          ✕
        </button>
      </div>

      {confirmando && (
        <div className="border-t border-slate-800 bg-red-950/20 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-300">
            ¿Eliminar <span className="font-bold">{liga.nombre_liga}</span> y sus {liga.miembros.length} miembro{liga.miembros.length !== 1 ? 's' : ''}?
            {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setConfirmando(false); setError(null) }}
              disabled={eliminando}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              onClick={eliminar}
              disabled={eliminando}
              className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-40"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}

      {/* Pote y distribucion */}
      {(liga.pote_virtual ?? 0) > 0 && !distribucion && (
        <div className="border-t border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">
            Pote acumulado: <span className="text-yellow-400 font-black">{(liga.pote_virtual ?? 0).toLocaleString()} fichas</span>
          </span>
          {!confirmPote ? (
            <button
              onClick={() => setConfirmPote(true)}
              className="text-xs font-bold px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition-colors"
            >
              Distribuir pote
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              {error && <span className="text-xs text-red-400">{error}</span>}
              <button onClick={() => setConfirmPote(false)} className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded transition-colors">Cancelar</button>
              <button
                onClick={distribuirPote}
                disabled={distribuyendo}
                className="text-xs font-bold px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-colors disabled:opacity-40"
              >
                {distribuyendo ? 'Distribuyendo...' : 'Confirmar'}
              </button>
            </div>
          )}
        </div>
      )}

      {distribucion && (
        <div className="border-t border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex flex-col gap-2">
          <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Pote distribuido</p>
          {distribucion.map((p) => (
            <div key={p.nombre} className="flex justify-between text-sm">
              <span className="text-slate-300">{p.label} · {p.nombre}</span>
              <span className="text-yellow-400 font-black">+{p.monto.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

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
        <Link
          href="/admin/manual"
          target="_blank"
          className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors ml-auto"
        >
          Manual
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
            <TarjetaLiga
              key={liga.id}
              liga={liga}
              token={token}
              onEliminada={(id) => setLigas(prev => prev.filter(l => l.id !== id))}
            />
          ))
        )}
      </div>
    </main>
  )
}
