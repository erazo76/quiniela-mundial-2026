'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Partido, Prediccion } from '@/types'
import { TarjetaPartido } from './TarjetaPartido'
import { ModalPrediccion } from './ModalPrediccion'
import { CalendarioPartidos } from './CalendarioPartidos'
import { createClient } from '@/lib/supabase/client'

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

const ORDEN_FASES = ['grupos', 'dieciseisavos', 'octavos', 'cuartos', 'semis', 'final']

const LABEL_FASE: Record<string, string> = {
  grupos:        'Grupos',
  dieciseisavos: 'Ronda 32',
  octavos:       'Octavos',
  cuartos:       'Cuartos',
  semis:         'Semis',
  final:         'Final',
  tercer_puesto: '3er Puesto',
}

// Clave de día (YYYY-MM-DD) en horario local del dispositivo, consistente con
// el formato de fecha/hora de las tarjetas.
function fechaKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const LABEL_FASE_LARGO: Record<string, string> = {
  grupos:        'Fase de Grupos',
  dieciseisavos: 'Ronda de 32',
  octavos:       'Octavos de Final',
  cuartos:       'Cuartos de Final',
  semis:         'Semifinales',
  final:         'Final',
  tercer_puesto: '3er Puesto',
}

interface Props {
  usuarioId: string
  ligaId: string
  fichas: number
  ligaTipo: 'vip' | 'junior'
  onFichasChange: (nuevas: number) => void
}

export function PartidosTab({ usuarioId, ligaId, fichas, ligaTipo, onFichasChange }: Props) {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [cargando, setCargando] = useState(true)
  const [grupoActivo, setGrupoActivo] = useState('A')
  const [faseVista, setFaseVista] = useState<string | null>(null) // null = sigue faseActiva
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null) // clave YYYY-MM-DD, null = día por defecto
  const [partidoSeleccionado, setPartidoSeleccionado] = useState<Partido | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const faseTabsRef = useRef<HTMLDivElement>(null)

  const supabaseRef = useRef(createClient())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPartidos = useCallback(() => {
    fetch(`/api/partidos?usuario_id=${usuarioId}&fase=all`)
      .then((r) => r.json())
      .then((data) => setPartidos(data))
      .catch(() => {})
  }, [usuarioId])

  // Carga inicial
  useEffect(() => {
    setCargando(true)
    fetch(`/api/partidos?usuario_id=${usuarioId}&fase=all`)
      .then((r) => r.json())
      .then((data) => setPartidos(data))
      .finally(() => setCargando(false))
  }, [usuarioId])

  // Realtime WebSocket: dispara refetch cuando cambian partidos o predicciones.
  // Debounce de 600ms para agrupar actualizaciones masivas (ej: simulación de lote).
  // Fallback: polling cada 60s y al volver a la pestaña.
  useEffect(() => {
    const supabase = supabaseRef.current

    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(fetchPartidos, 600)
    }

    const channel = supabase
      .channel(`partidos-${usuarioId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidos' }, debouncedFetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'predicciones', filter: `usuario_id=eq.${usuarioId}` }, debouncedFetch)
      .subscribe()

    const onVisible = () => { if (!document.hidden) fetchPartidos() }
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(() => { if (!document.hidden) fetchPartidos() }, 60_000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [usuarioId, fetchPartidos])

  // Fase más temprana con partidos pendientes (la "activa" por defecto)
  const faseActiva = useMemo(() => {
    for (const fase of ORDEN_FASES) {
      if (partidos.some((p) => p.fase === fase && p.estado === 'pendiente')) return fase
    }
    for (let i = ORDEN_FASES.length - 1; i >= 0; i--) {
      if (partidos.some((p) => p.fase === ORDEN_FASES[i])) return ORDEN_FASES[i]
    }
    return 'grupos'
  }, [partidos])

  // Fases que tienen al menos un partido cargado
  const fasesConPartidos = useMemo(
    () => ORDEN_FASES.filter((f) => partidos.some((p) => p.fase === f)),
    [partidos]
  )

  // La fase que se muestra: la que eligió el usuario o la activa por defecto
  const esTodos = faseVista === 'todos'
  const faseEfectiva = faseVista ?? faseActiva
  const esGrupos = !esTodos && faseEfectiva === 'grupos'

  // Días distintos con partidos (orden cronológico) para el selector de fecha de "Todos"
  const fechasDisponibles = useMemo(() => {
    const mapa = new Map<string, { key: string; fecha: string; total: number; conPrediccion: number }>()
    for (const p of partidos) {
      const key = fechaKey(new Date(p.fecha_hora))
      const dia = mapa.get(key)
      if (dia) {
        dia.total++
        if (p.prediccion) dia.conPrediccion++
      } else {
        mapa.set(key, { key, fecha: p.fecha_hora, total: 1, conPrediccion: p.prediccion ? 1 : 0 })
      }
    }
    return [...mapa.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [partidos])

  // Día por defecto: hoy si tiene partidos, si no el próximo día con partidos, si no el último
  const fechaDefault = useMemo(() => {
    if (fechasDisponibles.length === 0) return null
    const hoy = fechaKey(new Date())
    if (fechasDisponibles.some((f) => f.key === hoy)) return hoy
    const proxima = fechasDisponibles.find((f) => f.key >= hoy)
    return (proxima ?? fechasDisponibles[fechasDisponibles.length - 1]).key
  }, [fechasDisponibles])

  // El día efectivo mostrado en "Todos": el elegido o el de por defecto
  const fechaEfectiva = (fechaSeleccionada && fechasDisponibles.some((f) => f.key === fechaSeleccionada))
    ? fechaSeleccionada
    : fechaDefault

  function seleccionarFase(fase: string) {
    setFaseVista(fase === faseActiva ? null : fase)
    // Scroll el tab seleccionado al centro
    const container = faseTabsRef.current
    const btn = container?.querySelector(`[data-fase="${fase}"]`) as HTMLElement
    if (container && btn) {
      const offset = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2
      container.scrollTo({ left: offset, behavior: 'smooth' })
    }
  }

  function centrarChip(selector: string) {
    const container = tabsRef.current
    const btn = container?.querySelector(selector) as HTMLElement | null
    if (container && btn) {
      const offset = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2
      container.scrollTo({ left: offset, behavior: 'smooth' })
    }
  }

  function handleGrupoClick(grupo: string) {
    setGrupoActivo(grupo)
    centrarChip(`[data-grupo="${grupo}"]`)
  }

  function activarTodos() {
    setFechaSeleccionada(null) // vuelve al día por defecto cada vez que se entra
    setFaseVista('todos')
  }

  function handlePartidoClick(partido: Partido) {
    const canPredict = partido.estado === 'pendiente' &&
      new Date() < new Date(new Date(partido.fecha_hora).getTime() - 5 * 60 * 1000)
    if (canPredict || partido.prediccion) {
      setPartidoSeleccionado(partido)
    }
  }

  function handlePrediccionGuardada(fichasNuevas: number, prediccion: Prediccion) {
    onFichasChange(fichasNuevas)
    setPartidos((prev) =>
      prev.map((p) =>
        p.id === prediccion.partido_id ? { ...p, prediccion } : p
      )
    )
    setPartidoSeleccionado(null)
  }

  // Partidos a mostrar según la fase efectiva
  const partidosMostrados = useMemo(() => {
    if (esTodos) {
      return partidos
        .filter((p) => fechaEfectiva && fechaKey(new Date(p.fecha_hora)) === fechaEfectiva)
        .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
    }
    if (esGrupos) return partidos.filter((p) => p.grupo === grupoActivo)
    const principales = partidos.filter((p) => p.fase === faseEfectiva)
    const extras = faseEfectiva === 'final'
      ? partidos.filter((p) => p.fase === 'tercer_puesto')
      : []
    return [...principales, ...extras].sort((a, b) =>
      a.fecha_hora.localeCompare(b.fecha_hora)
    )
  }, [partidos, faseEfectiva, esGrupos, esTodos, fechaEfectiva, grupoActivo])

  // Conteo de partidos sin predicción en la vista actual (solo pendientes).
  // En "Todos" se acota al día seleccionado para reflejar lo que se muestra.
  const conteoSinPrediccion = useMemo(() => {
    const fases = esGrupos
      ? ['grupos']
      : [faseEfectiva, ...(faseEfectiva === 'final' ? ['tercer_puesto'] : [])]
    return partidos.filter(
      (p) =>
        (esTodos
          ? fechaEfectiva && fechaKey(new Date(p.fecha_hora)) === fechaEfectiva
          : fases.includes(p.fase)) &&
        !p.prediccion &&
        p.estado === 'pendiente' &&
        new Date() < new Date(new Date(p.fecha_hora).getTime() - 5 * 60 * 1000)
    ).length
  }, [partidos, faseEfectiva, esGrupos, esTodos, fechaEfectiva])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Tabs de navegación de fases */}
      {fasesConPartidos.length > 1 && (
        <div
          ref={faseTabsRef}
          className="flex gap-1.5 px-4 pt-3 pb-2 overflow-x-auto shrink-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {fasesConPartidos.map((fase) => {
            const estaActiva = fase === faseActiva
            const estaSeleccionada = fase === faseEfectiva
            const todoFinalizado = partidos
              .filter((p) => p.fase === fase)
              .every((p) => p.estado === 'finalizado')
            return (
              <button
                key={fase}
                data-fase={fase}
                onClick={() => seleccionarFase(fase)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${
                  estaSeleccionada
                    ? 'bg-green-500 text-black'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                {LABEL_FASE[fase]}
                {estaActiva && !todoFinalizado && !estaSeleccionada && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                )}
                {todoFinalizado && !estaSeleccionada && (
                  <span className="text-[9px] text-slate-600">✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Banner partidos sin predicción */}
      {conteoSinPrediccion > 0 && (
        <div className="mx-4 mt-1 rounded-2xl border border-yellow-500/40 bg-yellow-500/20 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-widest">
              Partidos sin predicción
            </p>
            <p className="text-3xl font-black text-yellow-300 leading-tight">{conteoSinPrediccion}</p>
          </div>
          <Image src="/ui/icon-exclamation.png" alt="!" width={44} height={44} unoptimized />
        </div>
      )}

      {esGrupos || esTodos ? (
        /* ── Selector: chip "Todos" + grupos (fase grupos) o fechas (modo Todos) ── */
        <div
          ref={tabsRef}
          className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Chip "Todos" — al lado de los selectores de grupo */}
          <button
            onClick={activarTodos}
            className={`flex flex-col items-center justify-center gap-1 shrink-0 px-3 py-2 rounded-2xl border transition-colors ${
              esTodos
                ? 'bg-green-500 border-green-500 text-black'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
            }`}
          >
            <span className="text-sm font-black">Todos</span>
            <span className={`text-[10px] uppercase tracking-wide ${esTodos ? 'text-black/60' : 'text-slate-600'}`}>
              por día
            </span>
          </button>

          {esTodos
            ? /* ── Datepicker customizado ── */
              <CalendarioPartidos
                dias={fechasDisponibles}
                valor={fechaEfectiva}
                onSelect={setFechaSeleccionada}
              />
            : /* ── Tabs de grupos ── */
              GRUPOS.map((g) => {
                const partidosDeGrupo = partidos.filter((p) => p.grupo === g)
                const conPrediccion = partidosDeGrupo.filter((p) => p.prediccion).length
                const totalGrupo = partidosDeGrupo.length
                const isActive = g === grupoActivo
                return (
                  <button
                    key={g}
                    data-grupo={g}
                    onClick={() => handleGrupoClick(g)}
                    className={`flex flex-col items-center gap-1 shrink-0 w-12 py-2 rounded-2xl border transition-colors ${
                      isActive
                        ? 'bg-green-500 border-green-500 text-black'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-sm font-black">{g}</span>
                    <span className={`text-xs ${isActive ? 'text-black/60' : 'text-slate-600'}`}>
                      {conPrediccion}/{totalGrupo}
                    </span>
                  </button>
                )
              })}
        </div>
      ) : (
        /* ── Header de fase knockout ── */
        <div className="px-4 py-2 shrink-0">
          <h2 className="text-sm font-black text-white">
            {LABEL_FASE_LARGO[faseEfectiva]}
          </h2>
        </div>
      )}

      {/* Partidos */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3 pt-1">
        {cargando ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-slate-900 rounded-2xl animate-pulse" />
          ))
        ) : partidosMostrados.length === 0 ? (
          <p className="text-slate-600 text-center py-8 text-sm">
            {esTodos ? 'No hay partidos en esta fecha' : 'No hay partidos en esta fase'}
          </p>
        ) : (
          <>
            {!esGrupos && faseEfectiva === 'final' &&
              partidos.filter((p) => p.fase === 'tercer_puesto').length > 0 && (
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mt-1">
                {LABEL_FASE_LARGO['final']}
              </p>
            )}
            {partidosMostrados.map((partido, i) => (
              <div key={partido.id}>
                {esTodos && partido.fase !== partidosMostrados[i - 1]?.fase && (
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mt-3 mb-1">
                    {LABEL_FASE_LARGO[partido.fase]}
                  </p>
                )}
                {!esGrupos && faseEfectiva === 'final' && partido.fase === 'tercer_puesto' && (
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mt-3 mb-1">
                    {LABEL_FASE_LARGO['tercer_puesto']}
                  </p>
                )}
                <TarjetaPartido
                  partido={partido}
                  ligaTipo={ligaTipo}
                  ligaId={ligaId}
                  usuarioId={usuarioId}
                  onClick={() => handlePartidoClick(partido)}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Modal */}
      {partidoSeleccionado && (
        <ModalPrediccion
          partido={partidoSeleccionado}
          prediccionExistente={partidoSeleccionado.prediccion ?? null}
          fichas={fichas}
          ligaTipo={ligaTipo}
          usuarioId={usuarioId}
          onClose={() => setPartidoSeleccionado(null)}
          onGuardada={handlePrediccionGuardada}
        />
      )}
    </div>
  )
}
