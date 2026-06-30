'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Partido } from '@/types'
import { getEmpatadosSinResolver } from '@/lib/grupos'

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

const FASES_ELIMINACION = ['dieciseisavos', 'octavos', 'cuartos', 'semis', 'tercer_puesto', 'final']

function FilaPartido({ partido, token, onActualizado }: FilaPartidoProps) {
  const [resLocal, setResLocal] = useState(partido.resultado_local ?? 0)
  const [resVisit, setResVisit] = useState(partido.resultado_visitante ?? 0)
  const [penalesLocal, setPenalesLocal] = useState(partido.penales_local ?? 0)
  const [penalesVisitante, setPenalesVisitante] = useState(partido.penales_visitante ?? 0)
  const [estado, setEstado] = useState(partido.estado)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null)
  const [verPreds, setVerPreds] = useState(false)
  const [preds, setPreds] = useState<PredAdmin[] | null>(null)
  const [cargandoPreds, setCargandoPreds] = useState(false)

  // Sincronizar estado local cuando las props cambian (ej: tras reset masivo o
  // tras un guardado que refresca la fila). Colapsa el modo edición.
  useEffect(() => {
    setResLocal(partido.resultado_local ?? 0)
    setResVisit(partido.resultado_visitante ?? 0)
    setEstado(partido.estado)
    setEditando(false)
  }, [partido.resultado_local, partido.resultado_visitante, partido.estado])

  // Reabrir un partido finalizado para corregirlo. El marcador guardado es el
  // TOTAL (regulación + penales), así que se descompone para mostrar la regulación
  // en los inputs de goles y los penales en sus propios campos.
  function abrirEdicion() {
    setResLocal((partido.resultado_local ?? 0) - (partido.penales_local ?? 0))
    setResVisit((partido.resultado_visitante ?? 0) - (partido.penales_visitante ?? 0))
    setPenalesLocal(partido.penales_local ?? 0)
    setPenalesVisitante(partido.penales_visitante ?? 0)
    setEstado('finalizado')
    setMsg(null)
    setEditando(true)
  }

  const esEliminatoria = FASES_ELIMINACION.includes(partido.fase)
  const esEmpate = resLocal === resVisit
  const necesitaPenales = esEliminatoria && esEmpate && estado === 'finalizado'
  const penalesValidos = penalesLocal !== penalesVisitante

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
      const body: Record<string, unknown> = {
        token,
        partido_id: partido.id,
        resultado_local: resLocal,
        resultado_visitante: resVisit,
        estado,
      }
      if (necesitaPenales && penalesValidos) {
        body.penales_local = penalesLocal
        body.penales_visitante = penalesVisitante
      }
      const res = await fetch('/api/admin/resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ texto: data.error ?? 'Error', ok: false })
        return
      }
      const texto = data.recalculado
        ? `Recalculado · ${data.corregidas ?? 0} predicciones corregidas`
        : estado === 'finalizado' && data.procesadas > 0
          ? `Guardado · ${data.procesadas} predicciones calculadas`
          : 'Guardado'
      setMsg({ texto, ok: true })
      const usaPenales = necesitaPenales && penalesValidos
      const totalLocal = resLocal + (usaPenales ? penalesLocal : 0)
      const totalVisitante = resVisit + (usaPenales ? penalesVisitante : 0)
      onActualizado(partido.id, {
        resultado_local: totalLocal,
        resultado_visitante: totalVisitante,
        penales_local: usaPenales ? penalesLocal : null,
        penales_visitante: usaPenales ? penalesVisitante : null,
        estado,
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
      {(!finalizado || editando) && (
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
              disabled={guardando || (necesitaPenales && !penalesValidos)}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black text-sm font-bold rounded-lg transition-colors"
            >
              {guardando ? '...' : editando ? 'Recalcular' : 'Guardar'}
            </button>

            {/* Cancelar — solo al reabrir un partido ya finalizado */}
            {editando && (
              <button
                onClick={() => setEditando(false)}
                disabled={guardando}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* Goles en penales (eliminatoria + empate en regulación + finalizado) */}
          {necesitaPenales && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-amber-400 font-semibold">
                Empate en regulación — ingresa los goles en penales
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={penalesLocal}
                  onChange={(e) => setPenalesLocal(Number(e.target.value))}
                  className="w-14 text-center bg-slate-800 border border-slate-700 rounded-lg py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-600 font-bold">-</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={penalesVisitante}
                  onChange={(e) => setPenalesVisitante(Number(e.target.value))}
                  className="w-14 text-center bg-slate-800 border border-slate-700 rounded-lg py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-500">(penales)</span>
                {necesitaPenales && !penalesValidos && (
                  <span className="text-xs text-red-400">Los penales deben tener ganador</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resultado final (solo lectura) */}
      {finalizado && !editando && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-slate-400 text-sm font-bold">
            Resultado: {partido.resultado_local} - {partido.resultado_visitante}
            {partido.penales_local != null && (
              <span className="ml-1.5 text-amber-400 text-xs font-semibold">
                (p {partido.penales_local}-{partido.penales_visitante})
              </span>
            )}
            <span className="ml-2 text-slate-600 font-normal text-xs">calculado</span>
          </p>
          <button
            onClick={abrirEdicion}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors shrink-0"
          >
            Reabrir para corregir
          </button>
        </div>
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

// ─── Desempate components ──────────────────────────────────────────────────

function GrupoDesempate({
  letra, equipos, ordenActual, token, onGuardado,
}: {
  letra: string
  equipos: string[]
  ordenActual: Record<string, number>
  token: string
  onGuardado: (grupo: string, orden: Record<string, number>) => void
}) {
  const [orden, setOrden] = useState<string[]>(() =>
    [...equipos].sort((a, b) => {
      const oa = ordenActual[a] ?? Infinity, ob = ordenActual[b] ?? Infinity
      return oa !== ob ? oa - ob : a.localeCompare(b)
    })
  )
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function mover(idx: number, dir: -1 | 1) {
    const next = [...orden]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setOrden(next)
    setMsg(null)
  }

  async function guardar() {
    setGuardando(true); setMsg(null)
    const items = orden.map((equipo, i) => ({ grupo: letra, equipo, orden: i + 1 }))
    const res = await fetch('/api/admin/desempates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, items }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg('Guardado')
      const map: Record<string, number> = {}
      orden.forEach((eq, i) => { map[eq] = i + 1 })
      onGuardado(letra, map)
    } else {
      setMsg(data.error ?? 'Error')
    }
    setGuardando(false)
  }

  async function borrar() {
    setGuardando(true)
    const res = await fetch('/api/admin/desempates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, grupo: letra }),
    })
    if (res.ok) {
      setMsg('Borrado')
      onGuardado(letra, {})
      setOrden([...equipos].sort((a, b) => a.localeCompare(b)))
    }
    setGuardando(false)
  }

  const hasOrden = Object.keys(ordenActual).length > 0

  return (
    <div className="bg-amber-950/20 border border-amber-700/40 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Grupo {letra}</p>
      <div className="flex flex-col gap-2">
        {orden.map((equipo, idx) => (
          <div key={equipo} className="flex items-center gap-3">
            <span className="text-slate-500 text-xs w-5 shrink-0 tabular-nums">{idx + 1}°</span>
            <span className="text-white text-sm flex-1 truncate">{equipo}</span>
            <div className="flex gap-1">
              <button
                onClick={() => mover(idx, -1)}
                disabled={idx === 0}
                className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-lg text-xs text-slate-300 transition-colors"
              >↑</button>
              <button
                onClick={() => mover(idx, 1)}
                disabled={idx === orden.length - 1}
                className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-lg text-xs text-slate-300 transition-colors"
              >↓</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={guardar}
          disabled={guardando}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
        >
          {guardando ? '...' : 'Guardar orden'}
        </button>
        {hasOrden && (
          <button
            onClick={borrar}
            disabled={guardando}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
          >
            Borrar
          </button>
        )}
        {msg && (
          <span className={`text-xs font-semibold ${msg === 'Guardado' ? 'text-green-400' : msg === 'Borrado' ? 'text-slate-400' : 'text-red-400'}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}

const GRUPOS_LETRAS = ['A','B','C','D','E','F','G','H','I','J','K','L']

function DesempatePanel({ partidos, token }: { partidos: Partido[]; token: string }) {
  const [ordenData, setOrdenData] = useState<Record<string, Record<string, number>>>({})
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/desempates')
      .then(r => r.json())
      .then((rows: { grupo: string; equipo: string; orden: number }[]) => {
        const map: Record<string, Record<string, number>> = {}
        for (const row of rows) {
          if (!map[row.grupo]) map[row.grupo] = {}
          map[row.grupo][row.equipo] = row.orden
        }
        setOrdenData(map)
      })
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return null

  // Detect groups with all matches done and unresolvable ties
  const gruposConEmpate: { letra: string; equiposEmpatados: string[][] }[] = []
  for (const letra of GRUPOS_LETRAS) {
    const gPartidos = partidos.filter(p => p.grupo === letra)
    if (gPartidos.length === 0) continue
    if (!gPartidos.every(p => p.estado === 'finalizado')) continue
    const empatados = getEmpatadosSinResolver(gPartidos)
    if (empatados.length > 0) gruposConEmpate.push({ letra, equiposEmpatados: empatados })
  }

  return (
    <div className="flex flex-col gap-3 mt-4 max-w-2xl mx-auto px-4 pb-8">
      <div className="border-b border-amber-700/30 pb-2">
        <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
          Desempates manuales — Criterios 7/8 FIFA
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Solo se muestran grupos con todos los partidos finalizados donde puntos, diferencia de goles, goles a favor y enfrentamientos directos (H2H) siguen igualados.
        </p>
      </div>

      {gruposConEmpate.length === 0 ? (
        <p className="text-xs text-slate-600 py-2">
          Sin empates pendientes — todos los criterios automáticos resuelven correctamente.
        </p>
      ) : (
        gruposConEmpate.flatMap(({ letra, equiposEmpatados }) =>
          equiposEmpatados.map((equipos, idx) => (
            <GrupoDesempate
              key={`${letra}-${idx}`}
              letra={letra}
              equipos={equipos}
              ordenActual={ordenData[letra] ?? {}}
              token={token}
              onGuardado={(g, orden) =>
                setOrdenData(prev => ({ ...prev, [g]: orden }))
              }
            />
          ))
        )
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────

export default function AdminPartidosPage() {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [cargando, setCargando] = useState(true)
  const [faseActiva, setFaseActiva] = useState('grupos')
  const [token, setToken] = useState('')
  const [sincronizando, setSincronizando] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [simulando, setSimulando] = useState(false)
  const [confirmarReset, setConfirmarReset] = useState(false)
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

  async function backfillBracket() {
    setBackfilling(true)
    setMsgSync(null)
    try {
      const res = await fetch('/api/admin/backfill-bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsgSync(`Error en backfill: ${data.error ?? 'intenta de nuevo'}`)
      } else {
        setMsgSync(`Bracket resuelto · ${data.procesados} partido(s) procesados`)
        const r = await fetch('/api/partidos?fase=all')
        setPartidos(await r.json())
      }
    } catch {
      setMsgSync('Error de conexión')
    } finally {
      setBackfilling(false)
    }
  }

  async function resetPartidos() {
    setConfirmarReset(false)
    setResetting(true)
    setMsgSync(null)
    try {
      const res = await fetch('/api/admin/reset-partidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsgSync(`Error al resetear: ${data.error ?? 'intenta de nuevo'}`)
      } else {
        setMsgSync('Todos los partidos reseteados a pendiente')
        const r = await fetch('/api/partidos?fase=all')
        setPartidos(await r.json())
      }
    } catch {
      setMsgSync('Error de conexión')
    } finally {
      setResetting(false)
    }
  }

  async function simularLote() {
    setSimulando(true)
    setMsgSync(null)
    try {
      const res = await fetch('/api/admin/simular-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fase: faseActiva }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsgSync(`Error al simular: ${data.error ?? 'intenta de nuevo'}`)
        return
      }
      if (data.procesados === 0) {
        setMsgSync('Sin partidos pendientes en esta fase')
        return
      }

      for (const p of data.partidos) {
        handleActualizado(p.id, {
          resultado_local:     p.resultado_local,
          resultado_visitante: p.resultado_visitante,
          penales_local:       p.penales_local  ?? undefined,
          penales_visitante:   p.penales_visitante ?? undefined,
          estado: 'finalizado',
        })
      }

      // Verificar si quedan pendientes en la fase actual
      const procesadosIds = new Set<string>(data.partidos.map((p: { id: string }) => p.id))
      const quedanPendientes = partidos.some(
        p => p.fase === faseActiva && p.estado === 'pendiente' && !procesadosIds.has(p.id)
      )

      if (quedanPendientes) {
        setMsgSync(`${data.procesados} partido(s) simulados`)
      } else {
        // Fase completa: refetch para obtener nombres/banderas actualizados por el resolver
        const fresh: Partido[] = await fetch('/api/partidos?fase=all').then(r => r.json())
        setPartidos(fresh)

        const nextFase = FASES_ORDEN.find(
          f => FASES_ORDEN.indexOf(f) > FASES_ORDEN.indexOf(faseActiva) &&
               fresh.some(p => p.fase === f && p.estado === 'pendiente')
        )
        if (nextFase) {
          setFaseActiva(nextFase)
          setMsgSync(`${FASES_LABEL[faseActiva]} completa · Pasando a ${FASES_LABEL[nextFase]}`)
        } else {
          setMsgSync(`${FASES_LABEL[faseActiva]} completa · No hay más fases pendientes`)
        }
      }
    } catch {
      setMsgSync('Error de conexión')
    } finally {
      setSimulando(false)
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
    <main className="h-screen flex flex-col overflow-hidden text-white bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Admin</p>
            <h1 className="text-base font-black text-white">Quiniela Mundial 2026</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{conteoEnVivo} en vivo · {conteoFinalizado} finalizados</span>
            <button
              onClick={() => setConfirmarReset(true)}
              disabled={resetting}
              className="px-3 py-1.5 bg-red-950 hover:bg-red-900 disabled:opacity-40 text-red-400 font-semibold rounded-lg transition-colors"
            >
              {resetting ? 'Reseteando...' : 'Reset'}
            </button>
            <button
              onClick={simularLote}
              disabled={simulando}
              className="px-3 py-1.5 bg-violet-900 hover:bg-violet-800 disabled:opacity-40 text-violet-300 font-semibold rounded-lg transition-colors"
            >
              {simulando ? 'Simulando...' : `Simular lote (${faseActiva})`}
            </button>
            <button
              onClick={backfillBracket}
              disabled={backfilling}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold rounded-lg transition-colors"
            >
              {backfilling ? 'Resolviendo...' : 'Resolver bracket'}
            </button>
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
      <nav className="flex gap-1 px-4 py-3 border-b border-slate-800 shrink-0">
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
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-slate-800 shrink-0" style={{ scrollbarWidth: 'none' }}>
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

      {/* Modal confirmación reset */}
      {confirmarReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-slate-950 border border-red-900/50 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Acción irreversible</p>
              <h2 className="text-base font-black text-white">¿Resetear todos los partidos?</h2>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Se limpiarán todos los resultados y el estado pasará a{' '}
              <span className="text-white font-semibold">pendiente</span>. Las predicciones y puntuaciones
              de las ligas <span className="text-white font-semibold">no se tocan</span> (eso se resetea por
              liga). No se puede deshacer.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmarReset(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={resetPartidos}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-colors"
              >
                Resetear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de partidos — área con scroll */}
      <div className="flex-1 overflow-y-auto">
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

      {/* Panel de desempates manuales — solo visible en fase de grupos */}
      {!cargando && faseActiva === 'grupos' && (
        <DesempatePanel
          partidos={partidos.filter(p => p.fase === 'grupos')}
          token={token}
        />
      )}
      </div>{/* fin scroll container */}
    </main>
  )
}
