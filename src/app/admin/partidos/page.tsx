'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Partido } from '@/types'

const ADMIN_TOKEN_KEY = 'qm2026_admin_token'

const FASES_ORDEN = ['grupos', 'dieciseisavos', 'octavos', 'cuartos', 'semis', 'tercer_puesto', 'final']
const FASES_LABEL: Record<string, string> = {
  grupos: 'Fase de grupos',
  dieciseisavos: 'Dieciseisavos de final',
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer puesto',
  final: 'Final',
}

const ESTADOS_BADGE: Record<string, string> = {
  pendiente: 'bg-slate-800 text-slate-400',
  en_vivo: 'bg-green-500/20 text-green-400',
  finalizado: 'bg-blue-500/20 text-blue-400',
}

interface PredAdmin {
  id: string; nombre: string; pred: string
  fichas: number; tipo_acierto: string | null; acertado: boolean; ganancia: number
}

interface FilaPartidoProps {
  partido: Partido
  token: string
  onActualizado: (id: string, campos: Partial<Partido>) => void
}

const FASES_ELIMINACION = ['dieciseisavos', 'octavos', 'cuartos', 'semis']

function FilaPartido({ partido, token, onActualizado }: FilaPartidoProps) {
  const [resLocal, setResLocal] = useState(partido.resultado_local ?? 0)
  const [resVisit, setResVisit] = useState(partido.resultado_visitante ?? 0)
  const [estado, setEstado] = useState(partido.estado)
  const [ganadorManual, setGanadorManual] = useState<string>('')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null)
  const [verPreds, setVerPreds] = useState(false)
  const [preds, setPreds] = useState<PredAdmin[] | null>(null)
  const [cargandoPreds, setCargandoPreds] = useState(false)

  const esEliminatoria = FASES_ELIMINACION.includes(partido.fase)
  const esEmpate = resLocal === resVisit
  const necesitaGanadorManual = esEliminatoria && esEmpate && estado === 'finalizado'

  async function togglePreds() {
    if (verPreds) { setVerPreds(false); return }
    setVerPreds(true)
    if (preds !== null) return
    setCargandoPreds(true)
    const res = await fetch(`/api/admin/predicciones-partido?partido_id=${partido.id}`, {
      headers: { 'x-admin-token': token },
    })
    const data = await res.json()
    setPreds(Array.isArray(data) ? data : [])
    setCargandoPreds(false)
  }

  const finalizado = partido.estado === 'finalizado'

  async function guardar() {
    setGuardando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          partido_id: partido.id,
          resultado_local: resLocal,
          resultado_visitante: resVisit,
          estado,
          ...(ganadorManual ? { ganador_manual: ganadorManual } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ texto: data.error ?? 'Error', ok: false })
        return
      }
      const texto =
        estado === 'finalizado' && data.procesadas > 0
          ? `Guardado · ${data.procesadas} predicciones calculadas`
          : 'Guardado'
      setMsg({ texto, ok: true })
      onActualizado(partido.id, {
        resultado_local: resLocal,
        resultado_visitante: resVisit,
        estado,
        ganador: ganadorManual || undefined,
      })
    } catch {
      setMsg({ texto: 'Error de conexión', ok: false })
    } finally {
      setGuardando(false)
    }
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleString('es', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
      {/* Equipos y fecha */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-white">
            {partido.equipo_local} <span className="text-slate-600">vs</span> {partido.equipo_visitante}
          </p>
          <p className="text-xs text-slate-600">{formatFecha(partido.fecha_hora)} · {partido.sede ?? ''}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${ESTADOS_BADGE[partido.estado]}`}>
          {partido.estado}
        </span>
      </div>

      {/* Controles */}
      {!finalizado && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Score */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={20}
                value={resLocal}
                onChange={(e) => setResLocal(Number(e.target.value))}
                className="w-14 text-center bg-slate-800 border border-slate-700 rounded-lg py-2 text-white font-bold focus:outline-none focus:border-green-500"
              />
              <span className="text-slate-600 font-bold">-</span>
              <input
                type="number"
                min={0}
                max={20}
                value={resVisit}
                onChange={(e) => setResVisit(Number(e.target.value))}
                className="w-14 text-center bg-slate-800 border border-slate-700 rounded-lg py-2 text-white font-bold focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Estado */}
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_vivo">En vivo</option>
              <option value="finalizado">Finalizado</option>
            </select>

            {/* Guardar */}
            <button
              onClick={guardar}
              disabled={guardando || (necesitaGanadorManual && !ganadorManual)}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black text-sm font-bold rounded-lg transition-colors"
            >
              {guardando ? '...' : 'Guardar'}
            </button>
          </div>

          {/* Selector de ganador por penales (eliminatoria + empate + finalizado) */}
          {necesitaGanadorManual && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-amber-400 font-semibold">
                Empate en eliminatoria — ¿Quién ganó en penales?
              </p>
              <div className="flex gap-2">
                {[partido.equipo_local, partido.equipo_visitante].map((equipo) => (
                  <button
                    key={equipo}
                    onClick={() => setGanadorManual(equipo)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      ganadorManual === equipo
                        ? 'bg-amber-500 border-amber-500 text-black'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500/50'
                    }`}
                  >
                    {equipo}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resultado final (solo lectura) */}
      {finalizado && (
        <p className="text-slate-400 text-sm font-bold">
          Resultado: {partido.resultado_local} - {partido.resultado_visitante}
          <span className="ml-2 text-slate-600 font-normal text-xs">calculado</span>
        </p>
      )}

      {/* Mensaje */}
      {msg && (
        <p className={`text-xs font-semibold ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>
          {msg.texto}
        </p>
      )}

      {/* Predicciones */}
      <button
        onClick={togglePreds}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors text-left"
      >
        {verPreds ? 'Ocultar predicciones' : 'Ver predicciones'}
      </button>

      {verPreds && (
        <div className="border-t border-slate-800 pt-3 flex flex-col gap-1.5">
          {cargandoPreds && <p className="text-xs text-slate-600">Cargando...</p>}
          {preds?.length === 0 && <p className="text-xs text-slate-600">Sin predicciones</p>}
          {preds?.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold w-28 truncate">{p.nombre}</span>
              <span className="text-white font-black">{p.pred}</span>
              <span className="text-yellow-400">{p.fichas} fichas</span>
              <span className={
                p.tipo_acierto === 'exacto' ? 'text-yellow-300 font-bold' :
                p.tipo_acierto === 'ganador' ? 'text-green-400 font-bold' :
                p.tipo_acierto ? 'text-red-400' : 'text-slate-600'
              }>
                {p.tipo_acierto
                  ? `${p.tipo_acierto} ${p.ganancia > 0 ? `+${p.ganancia}` : ''}`
                  : 'pendiente'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPartidosPage() {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [cargando, setCargando] = useState(true)
  const [faseActiva, setFaseActiva] = useState('grupos')
  const [token, setToken] = useState('')
  const [sincronizando, setSincronizando] = useState(false)
  const [msgSync, setMsgSync] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const t = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (!t) { router.replace('/admin'); return }
    setToken(t)
    fetch('/api/partidos?fase=all')
      .then((r) => r.json())
      .then((data) => setPartidos(Array.isArray(data) ? data : []))
      .finally(() => setCargando(false))
  }, [router])

  const handleActualizado = useCallback((id: string, campos: Partial<Partido>) => {
    setPartidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...campos } : p)))
  }, [])

  async function sincronizar() {
    setSincronizando(true)
    setMsgSync(null)
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsgSync(`Error al sincronizar: ${data.error?.replace(/^TypeError: /, '') ?? 'intenta de nuevo'}`)
      } else {
        setMsgSync(
          data.sincronizados > 0
            ? `${data.sincronizados} partido(s) sincronizados`
            : data.mensaje ?? 'Sin cambios'
        )
        if (data.sincronizados > 0) {
          const r = await fetch('/api/partidos?fase=all')
          setPartidos(await r.json())
        }
      }
    } catch {
      setMsgSync('Error de conexión')
    } finally {
      setSincronizando(false)
    }
  }

  function salir() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    router.push('/admin')
  }

  const partidosFase = partidos.filter((p) => p.fase === faseActiva)
  const conteoEnVivo = partidos.filter((p) => p.estado === 'en_vivo').length
  const conteoFinalizado = partidos.filter((p) => p.estado === 'finalizado').length

  return (
    <main className="min-h-screen text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Admin</p>
            <h1 className="text-base font-black text-white">Quiniela Mundial 2026</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{conteoEnVivo} en vivo · {conteoFinalizado} finalizados</span>
            <button
              onClick={sincronizar}
              disabled={sincronizando}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold rounded-lg transition-colors"
            >
              {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            <button onClick={salir} className="text-red-400 hover:text-red-300 transition-colors font-semibold">
              Salir
            </button>
          </div>
        </div>
        {msgSync && (
          <p className={`text-xs px-5 pb-2 ${msgSync.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {msgSync}
          </p>
        )}
      </header>

      {/* Nav */}
      <nav className="flex gap-1 px-4 py-3 border-b border-slate-800">
        <Link
          href="/admin/partidos"
          className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-green-500 text-black"
        >
          Partidos
        </Link>
        <Link
          href="/admin/ligas"
          className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
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

      {/* Tabs de fase */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-slate-800" style={{ scrollbarWidth: 'none' }}>
        {FASES_ORDEN.map((fase) => {
          const count = partidos.filter((p) => p.fase === fase && p.estado !== 'finalizado').length
          return (
            <button
              key={fase}
              onClick={() => setFaseActiva(fase)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${
                faseActiva === fase
                  ? 'bg-green-500 text-black'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {FASES_LABEL[fase]}
              {count > 0 && (
                <span className={`ml-1.5 ${faseActiva === fase ? 'text-black/60' : 'text-slate-600'}`}>
                  ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Lista de partidos */}
      <div className="px-4 py-4 flex flex-col gap-3 max-w-2xl mx-auto">
        {cargando ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-900 rounded-2xl animate-pulse" />
          ))
        ) : partidosFase.length === 0 ? (
          <p className="text-slate-600 text-center py-8 text-sm">
            No hay partidos en esta fase
          </p>
        ) : (
          partidosFase.map((p) => (
            <FilaPartido
              key={p.id}
              partido={p}
              token={token}
              onActualizado={handleActualizado}
            />
          ))
        )}
      </div>
    </main>
  )
}
