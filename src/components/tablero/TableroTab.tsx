'use client'
import { useState, useEffect, useRef, useMemo, Fragment, type CSSProperties } from 'react'
import { Partido } from '@/types'
import { calcularGrupo, DesempatesGrupo } from '@/lib/grupos'
import { createClient } from '@/lib/supabase/client'

function shortName(name: string) {
  const abbr: Record<string, string> = {
    'República Checa': 'R. Checa',
    'Arabia Saudita': 'A. Saudita',
    'Bosnia y Herzegovina': 'Bosnia',
    'República Democrática del Congo': 'R.D. Congo',
    'Costa de Marfil': 'Marfil',
    'Países Bajos': 'P. Bajos',
    'Estados Unidos': 'EE.UU.',
    'Nueva Zelanda': 'N. Zelanda',
  }
  return abbr[name] ?? (name.length > 12 ? name.slice(0, 11) + '.' : name)
}

// ─── Grupos View ───────────────────────────────────────────────────────────

const COL = 'grid-cols-[1fr_22px_18px_18px_18px_26px_28px]'

function GrupoCard({ letra, partidos, desempates }: { letra: string; partidos: Partido[]; desempates: DesempatesGrupo }) {
  const rows = calcularGrupo(partidos, desempates)
  const grupoHaJugado = rows.some(r => r.pj > 0)
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-slate-800/60 border-b border-slate-700">
        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Grupo {letra}</span>
      </div>

      {/* Encabezado */}
      <div className={`grid ${COL} text-[10px] text-slate-400 border-b border-slate-800 px-2 py-1`}>
        <span>Equipo</span>
        <span className="text-center">PJ</span>
        <span className="text-center">G</span>
        <span className="text-center">E</span>
        <span className="text-center">P</span>
        <span className="text-center">DG</span>
        <span className="text-center text-yellow-500">Pts</span>
      </div>

      {/* Filas */}
      {rows.map((s, i) => {
        const top = i < 2 && grupoHaJugado
        return (
          <div
            key={s.equipo}
            className={`grid ${COL} text-[11px] px-2 py-1.5 border-b border-slate-800/40 last:border-0 items-center ${top ? 'text-white' : 'text-slate-300'}`}
          >
            <div className="flex items-center gap-1 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${top ? 'bg-green-500' : 'bg-transparent'}`} />
              {s.bandera
                ? <img src={s.bandera} alt="" className="w-4 h-3 object-cover rounded-sm shrink-0" />
                : <div className="w-4 h-3 bg-slate-700 rounded-sm shrink-0" />
              }
              <span className="truncate">{shortName(s.equipo)}</span>
            </div>
            <span className="text-center">{s.pj}</span>
            <span className="text-center">{s.pg}</span>
            <span className="text-center">{s.pe}</span>
            <span className="text-center">{s.pp}</span>
            <span className="text-center">{s.dif > 0 ? `+${s.dif}` : s.dif}</span>
            <span className="text-center font-black text-yellow-400">{s.pts}</span>
          </div>
        )
      })}

      {rows.length === 0 && (
        <p className="text-[11px] text-slate-400 text-center py-3">Sin datos</p>
      )}
    </div>
  )
}

function GruposView({ partidos, desempatesAll }: { partidos: Partido[]; desempatesAll: Record<string, DesempatesGrupo> }) {
  const GRUPOS = ['A','B','C','D','E','F','G','H','I','J','K','L']
  const byGrupo: Record<string, Partido[]> = {}
  for (const g of GRUPOS) byGrupo[g] = []
  for (const p of partidos) { if (p.grupo) byGrupo[p.grupo]?.push(p) }
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GRUPOS.map(g => (
          <GrupoCard
            key={g}
            letra={g}
            partidos={byGrupo[g] ?? []}
            desempates={desempatesAll[g] ?? {}}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Llave (Bracket) View ──────────────────────────────────────────────────

const FASES: { key: string; label: string }[] = [
  { key: 'dieciseisavos', label: 'Ronda de 32' },
  { key: 'octavos',       label: 'Octavos' },
  { key: 'cuartos',       label: 'Cuartos' },
  { key: 'semis',         label: 'Semis' },
  { key: 'final',         label: 'Final' },
]

// Bracket layout constants
const CARD_W  = 172   // match card width in px
const CARD_H  = 52    // approximate rendered card height in px
const CON_W   = 28    // width of the SVG connector strip between columns
const LABEL_H = 22    // px reserved above bracket for phase labels
const LINE    = '#39ff14'  // connector line color (electric green)
const CORNER  = 8     // radius of rounded elbow corners (Google-style)

// Animation cadence (cascade by column, like Google's bracket reveal)
const STEP        = 240   // ms between consecutive columns
const DRAW_OFFSET = 170   // ms a connector waits after its column's cards begin

// Telescoping layout — the focused column spreads out, the others compact into
// clusters around their parent (Google-style "fisheye"). Connectors stay exact
// because every higher match is rendered at the midpoint of its two children.
const FOCUS_PITCH = 120         // comfortable center-to-center in the focused column
const TIGHT       = CARD_H + 2  // compacted center-to-center (cards nearly touching)
const CLUSTER_GAP = 56          // breathing gap between focused clusters
const DIM_UNFOCUS = 0.5         // opacity of non-focused columns (focus stands out)
const TOP_PAD     = LABEL_H + 14
const TERCERO_OFF = 24          // gap below the Final card before the 3rd-place card

export interface BracketLayout { centers: number[][]; totalH: number }

/** Rounded "U" path linking a pair of child cards to their midpoint, plus the
 *  stub that exits toward the next column. Single path so the draw animation
 *  flows as one continuous stroke. */
function connectorPath(y1: number, y2: number, mx: number): string {
  const ym = (y1 + y2) / 2
  const r  = Math.min(CORNER, mx - 1, Math.max(0, (ym - y1) - 1))
  return (
    `M 0 ${y1} L ${mx - r} ${y1} Q ${mx} ${y1} ${mx} ${y1 + r} ` +
    `L ${mx} ${y2 - r} Q ${mx} ${y2} ${mx - r} ${y2} L 0 ${y2} ` +
    `M ${mx} ${ym} L ${CON_W} ${ym}`
  )
}

/** Per-column vertical centers with a telescope focused on column `focus`. */
function buildLayout(colCounts: number[], focus: number, hasTercer: boolean, finalIdx: number): BracketLayout {
  const n = colCounts.length
  if (n === 0) return { centers: [], totalH: 0 }

  const cf          = Math.max(0, Math.min(n - 1, focus))
  const nLeaves     = colCounts[0]
  const clusterSize = Math.pow(2, cf)
  const M           = Math.max(1, Math.round(nLeaves / clusterSize))
  const clusterH    = (clusterSize - 1) * TIGHT
  const clusterPitch = Math.max(FOCUS_PITCH, clusterH + CLUSTER_GAP)

  // Leaf centers (base column): tight clusters, generous gap between clusters.
  const leaves: number[] = []
  for (let c = 0; c < M; c++) {
    const clusterCenter = TOP_PAD + CARD_H / 2 + clusterH / 2 + c * clusterPitch
    const first = clusterCenter - clusterH / 2
    for (let i = 0; i < clusterSize; i++) leaves.push(first + i * TIGHT)
  }

  const centers: number[][] = [leaves]
  for (let ci = 1; ci < n; ci++) {
    const prev = centers[ci - 1]
    const cur: number[] = []
    for (let j = 0; j < colCounts[ci]; j++) {
      const a = prev[2 * j], b = prev[2 * j + 1]
      cur.push(a != null && b != null ? (a + b) / 2 : (a ?? b ?? 0))
    }
    centers.push(cur)
  }

  let maxY = 0
  for (const col of centers) for (const y of col) maxY = Math.max(maxY, y)
  let totalH = maxY + CARD_H / 2 + 16

  if (hasTercer && finalIdx >= 0 && centers[finalIdx]?.length) {
    const terceroBottom = centers[finalIdx][0] + CARD_H / 2 + TERCERO_OFF + CARD_H + 16
    totalH = Math.max(totalH, terceroBottom)
  }
  return { centers, totalH }
}

function sameShape(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i].length !== b[i].length) return false
  return true
}

function lerpLayout(from: BracketLayout, to: BracketLayout, t: number): BracketLayout {
  return {
    centers: to.centers.map((col, ci) => col.map((y, j) => {
      const f = from.centers[ci]?.[j]
      return f == null ? y : f + (y - f) * t
    })),
    totalH: from.totalH + (to.totalH - from.totalH) * t,
  }
}

// ─── MatchSlot ─────────────────────────────────────────────────────────────

function MatchSlot({ partido }: { partido: Partido }) {
  const hasResult = partido.resultado_local != null && partido.resultado_visitante != null
  // esPenales cuando existen goles de penales registrados (resultado_local ya incluye el total)
  const esPenales = hasResult && partido.penales_local != null
  const lWin = hasResult && partido.resultado_local! > partido.resultado_visitante!
  const vWin = hasResult && partido.resultado_visitante! > partido.resultado_local!

  function Row({ nombre, bandera, goles, win }: {
    nombre: string; bandera: string | null; goles: number | null; win: boolean
  }) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-[5px] ${win ? 'bg-green-500/10' : ''}`}>
        {bandera
          ? <img src={bandera} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
          : <div className="w-5 h-3.5 bg-slate-700/60 rounded-sm shrink-0" />
        }
        <span className={`text-[11px] truncate flex-1 ${win ? 'text-white font-bold' : 'text-slate-400'}`}>
          {shortName(nombre)}
        </span>
        {hasResult && (
          <span className={`text-[11px] font-black tabular-nums ${win ? 'text-green-400' : 'text-slate-500'}`}>
            {goles}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative w-[172px] shrink-0">
      {/* Badge (p) en esquina sup-der de la card, superpuesto sobre el borde */}
      {esPenales && (
        <span className="absolute -top-2 -right-2 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-black text-[8px] font-black leading-none z-20 border-2 border-slate-950">
          p
        </span>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <Row nombre={partido.equipo_local}     bandera={partido.bandera_local}     goles={partido.resultado_local}     win={lWin} />
        <div className="h-px bg-slate-800" />
        <Row nombre={partido.equipo_visitante} bandera={partido.bandera_visitante} goles={partido.resultado_visitante} win={vWin} />
      </div>
    </div>
  )
}

// ─── Connector SVG ─────────────────────────────────────────────────────────

function Connector({ childCenters, totalH, delay }: { childCenters: number[]; totalH: number; delay: number }) {
  const mx = CON_W / 2
  const pairs = Math.floor(childCenters.length / 2)
  return (
    <svg
      width={CON_W}
      height={totalH}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden
    >
      {Array.from({ length: pairs }, (_, j) => (
        <path
          key={j}
          className="brk-line"
          style={{ animationDelay: `${delay}ms` }}
          pathLength={1}
          d={connectorPath(childCenters[j * 2], childCenters[j * 2 + 1], mx)}
          stroke={LINE}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

// ─── Phase label style ─────────────────────────────────────────────────────

const LABEL_STYLE: CSSProperties = {
  position: 'absolute',
  top: -LABEL_H,
  left: 0,
  right: 0,
  textAlign: 'center',
  fontSize: 9,
  fontWeight: 900,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  lineHeight: `${LABEL_H}px`,
}

// ─── SemisConnector ────────────────────────────────────────────────────────
// Like Connector but adds dashed loser lines branching to the 3rd-place card

function SemisConnector({ childCenters, totalH, terceroCY, delay }: {
  childCenters: number[]; totalH: number; terceroCY: number; delay: number
}) {
  const mx = CON_W / 2
  const pairs = Math.floor(childCenters.length / 2)
  const r = CORNER
  return (
    <svg width={CON_W} height={totalH} style={{ display: 'block', flexShrink: 0 }} aria-hidden>
      {Array.from({ length: pairs }, (_, j) => {
        const y1 = childCenters[j * 2]
        const y2 = childCenters[j * 2 + 1]
        const ym = (y1 + y2) / 2
        // dashed loser path: down the bar from ym to the 3rd-place row, rounded turn out
        const loserD =
          `M ${mx} ${ym} L ${mx} ${terceroCY - r} Q ${mx} ${terceroCY} ${mx + r} ${terceroCY} L ${CON_W} ${terceroCY}`
        return (
          <g key={j}>
            {/* Winner path — solid green, rounded (same as regular Connector) */}
            <path
              className="brk-line"
              style={{ animationDelay: `${delay}ms` }}
              pathLength={1}
              d={connectorPath(y1, y2, mx)}
              stroke={LINE}
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Loser path — dashed slate, branches down to 3rd-place */}
            <path
              d={loserD}
              stroke="#475569"
              strokeWidth={1}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="3 3"
            />
          </g>
        )
      })}
    </svg>
  )
}

// ─── MedalBadge ────────────────────────────────────────────────────────────

const MEDALLAS_IMG = ['/ui/BrainMedal1st.png', '/ui/BrainMedal2nd.png', '/ui/BrainMedal3rd.png']

function MedalBadge({ pos, team }: {
  pos: 1 | 2 | 3
  team: { nombre: string; bandera: string | null }
}) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1 shadow-lg">
      <img src={MEDALLAS_IMG[pos - 1]} alt={`${pos}°`} className="w-5 h-5 shrink-0" />
      {team.bandera
        ? <img src={team.bandera} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
        : <div className="w-5 h-3.5 bg-slate-700 rounded-sm shrink-0" />
      }
      <span className="text-[11px] text-white font-semibold truncate max-w-[80px]">
        {shortName(team.nombre)}
      </span>
    </div>
  )
}

// ─── Bracket topology reconstruction ───────────────────────────────────────
// The knockout tree is encoded in the placeholder names: an Octavos match holds
// equipo_local/visitante = "Ganador D32-X" / "Ganador D32-Y", i.e. it is fed by
// the R32 matches at chronological positions X and Y. Those references are not
// consecutive (O1 ← D32-1 & D32-4), so rendering by array adjacency mis-pairs
// the bracket. We rebuild each column in true bracket order so the positional
// connectors line up with the real progression.

const FASE_PREFIX: Record<string, string> = {
  dieciseisavos: 'D32-', octavos: 'O', cuartos: 'C', semis: 'S', final: '',
}

/** Winning team of a knockout match (by score, then penalties, then stored ganador). */
function winnerName(p: Partido): string | null {
  if (p.ganador) return p.ganador
  if (p.resultado_local != null && p.resultado_visitante != null) {
    if (p.resultado_local > p.resultado_visitante) return p.equipo_local
    if (p.resultado_visitante > p.resultado_local) return p.equipo_visitante
    if (p.penales_local != null && p.penales_visitante != null)
      return p.penales_local > p.penales_visitante ? p.equipo_local : p.equipo_visitante
  }
  return null
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')
}

/**
 * Reorders each knockout column into true bracket order, so that match `2j` and
 * `2j+1` in column `ci-1` are exactly the two feeders of match `j` in column `ci`.
 * Resolves children either from the still-present "Ganador …" placeholder or, once
 * a match has been played, from the winning team name that propagated upward.
 * Returns null if the references can't be fully resolved (caller falls back to
 * chronological order, i.e. the previous behavior).
 */
function buildBracketOrder(sortedCols: Partido[][], faseKeys: string[]): Partido[][] | null {
  const n = sortedCols.length
  if (n === 0) return null

  const posMap = sortedCols.map(ms => {
    const m = new Map<number, Partido>(); ms.forEach((p, i) => m.set(i + 1, p)); return m
  })
  const winMap = sortedCols.map(ms => {
    const m = new Map<string, Partido>(); ms.forEach(p => { const w = winnerName(p); if (w) m.set(w, p) }); return m
  })

  const resolveChild = (slot: string, ci: number): Partido | null => {
    const re = new RegExp('^Ganador ' + escapeRe(FASE_PREFIX[faseKeys[ci]] ?? '') + '(\\d+)$')
    const m = slot.match(re)
    if (m) return posMap[ci].get(Number(m[1])) ?? null
    return winMap[ci].get(slot) ?? null
  }

  const ordered: Partido[][] = new Array(n)
  ordered[n - 1] = sortedCols[n - 1].slice()
  for (let ci = n - 1; ci > 0; ci--) {
    const childCol: Partido[] = []
    for (const parent of ordered[ci]) {
      for (const slot of [parent.equipo_local, parent.equipo_visitante]) {
        const child = resolveChild(slot, ci - 1)
        if (!child) return null
        childCol.push(child)
      }
    }
    ordered[ci - 1] = childCol
  }

  // Sanity: each column fully and uniquely covered
  for (let ci = 0; ci < n; ci++) {
    if (ordered[ci].length !== sortedCols[ci].length) return null
    if (new Set(ordered[ci].map(p => p.id)).size !== ordered[ci].length) return null
  }
  return ordered
}

// ─── LlaveView ─────────────────────────────────────────────────────────────

function LlaveView({ partidos }: { partidos: Partido[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [focusedCol, setFocusedCol] = useState(0)

  const byFase: Record<string, Partido[]> = {}
  for (const f of FASES) byFase[f.key] = []
  for (const p of partidos) {
    if (byFase[p.fase] !== undefined) byFase[p.fase].push(p)
  }
  byFase['tercer_puesto'] = partidos
    .filter(p => p.fase === 'tercer_puesto')
    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))

  const cols = FASES.filter(f => byFase[f.key].length > 0)

  // Reorder each column into true bracket order (falls back to chrono order)
  const sortedCols = cols.map(f => [...byFase[f.key]].sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora)))
  const orderedCols = buildBracketOrder(sortedCols, cols.map(c => c.key)) ?? sortedCols

  const semisIdx = cols.findIndex(c => c.key === 'semis')
  const finalIdx = cols.findIndex(c => c.key === 'final')
  const hasTercer = byFase['tercer_puesto'].length > 0 && finalIdx >= 0

  const colCounts = orderedCols.map(c => c.length)
  const countsKey = colCounts.join(',')

  // Telescope layout for the focused column, plus a rAF tween toward it so cards
  // and connectors animate together (SVG geometry can't be CSS-transitioned).
  const targetLayout = useMemo(
    () => buildLayout(colCounts, focusedCol, hasTercer, finalIdx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countsKey, focusedCol, hasTercer, finalIdx],
  )
  const displayRef = useRef<BracketLayout>(targetLayout)
  const [, bump] = useState(0)

  useEffect(() => {
    const from = displayRef.current
    const to = targetLayout
    if (from === to) return
    if (!sameShape(from.centers, to.centers)) { displayRef.current = to; bump(v => v + 1); return }
    let raf = 0
    const start = performance.now()
    const D = 470
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / D)
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2  // easeInOutQuad
      displayRef.current = lerpLayout(from, to, e)
      bump(v => v + 1)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [targetLayout])

  const canLeft  = focusedCol > 0
  const canRight = focusedCol < colCounts.length - 1
  const focusOn = (ci: number) => {
    const next = Math.max(0, Math.min(colCounts.length - 1, ci))
    if (next === focusedCol) return
    setFocusedCol(next)
    const el = scrollRef.current
    if (el) {
      const target = next * (CARD_W + CON_W) - (el.clientWidth - CARD_W) / 2
      el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    }
  }

  if (cols.length === 0 && !hasTercer) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Sin partidos de eliminatorias
      </div>
    )
  }

  const centers   = displayRef.current.centers
  const bracketH  = displayRef.current.totalH
  const mainMinW  = cols.length * CARD_W + Math.max(0, cols.length - 1) * CON_W

  // 3rd-place geometry derived from the (animated) Final center
  const finalCenter = finalIdx >= 0 && centers[finalIdx]?.length ? centers[finalIdx][0] : 0
  const TERCERO_Y   = finalCenter + CARD_H / 2 + TERCERO_OFF   // top of 3rd-place card
  const TERCERO_CY  = TERCERO_Y + CARD_H / 2

  // Derive medal teams from final / tercer_puesto results
  const finalMatch  = byFase['final']?.[0]
  const tercerMatch = byFase['tercer_puesto']?.[0]

  function getTeam(m: Partido | undefined, role: 'winner' | 'loser') {
    if (!m || m.resultado_local == null || m.resultado_visitante == null) return null
    const lw = m.resultado_local > m.resultado_visitante
    return role === 'winner'
      ? { nombre: lw ? m.equipo_local : m.equipo_visitante, bandera: lw ? m.bandera_local : m.bandera_visitante }
      : { nombre: lw ? m.equipo_visitante : m.equipo_local, bandera: lw ? m.bandera_visitante : m.bandera_local }
  }

  const campeon     = getTeam(finalMatch,  'winner')
  const subcampeon  = getTeam(finalMatch,  'loser')
  const tercerLugar = getTeam(tercerMatch, 'winner')

  return (
    <div className="flex-1 min-h-0 relative">
      <div ref={scrollRef} className="absolute inset-0 overflow-auto">
      {/* Bracket reveal animation — cards cascade in, connectors draw their stroke */}
      <style>{`
        @keyframes brkCard { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes brkDraw { to { stroke-dashoffset: 0; } }
        @keyframes chevHint { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
        .brk-card { opacity: 0; animation: brkCard 0.40s ease forwards; }
        .brk-line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: brkDraw 0.45s ease forwards; }
        .chev-hint { animation: chevHint 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .brk-card { opacity: 1; animation: none; }
          .brk-line { stroke-dashoffset: 0; animation: none; }
          .chev-hint { animation: none; }
        }
      `}</style>

      {/* Medal badges — sticky top-right so remain visible while scrolling */}
      {(campeon || subcampeon || tercerLugar) && (
        <div className="sticky top-2 float-right z-10 flex flex-col gap-1.5 pointer-events-none mr-2">
          {campeon     && <MedalBadge pos={1} team={campeon} />}
          {subcampeon  && <MedalBadge pos={2} team={subcampeon} />}
          {tercerLugar && <MedalBadge pos={3} team={tercerLugar} />}
        </div>
      )}

      {cols.length > 0 && (
        <div className="p-4 pb-8 flex justify-center" style={{ minWidth: mainMinW + 32 }}>
          <div className="flex items-start" style={{ paddingTop: LABEL_H }}>
            {cols.map((fase, ci) => {
                const matches = orderedCols[ci]
                const isFinal = fase.key === 'final'
                const isSemis = ci === semisIdx && hasTercer

                const isFocused = ci === focusedCol

                return (
                  <Fragment key={fase.key}>
                    {/* Column */}
                    <div
                      onClick={() => focusOn(ci)}
                      style={{
                        position: 'relative', width: CARD_W, height: bracketH, flexShrink: 0, cursor: 'pointer',
                        opacity: isFocused ? 1 : DIM_UNFOCUS,
                        transition: 'opacity 0.4s ease',
                      }}
                    >
                      <div style={{ ...LABEL_STYLE, color: isFocused ? LINE : LABEL_STYLE.color }}>{fase.label}</div>

                      {matches.map((p, mi) => (
                        <div
                          key={p.id}
                          className="brk-card"
                          style={{ position: 'absolute', top: centers[ci][mi] - CARD_H / 2, left: 0, animationDelay: `${ci * STEP + mi * 25}ms` }}
                        >
                          <MatchSlot partido={p} />
                        </div>
                      ))}

                      {/* 3rd-place card in the Final column */}
                      {isFinal && byFase['tercer_puesto'].map((p) => (
                        <Fragment key={p.id}>
                          <div style={{ ...LABEL_STYLE, position: 'absolute', top: TERCERO_Y - LABEL_H, left: 0, right: 0 }}>
                            3er Puesto
                          </div>
                          <div
                            className="brk-card"
                            style={{ position: 'absolute', top: TERCERO_Y, left: 0, animationDelay: `${ci * STEP}ms` }}
                          >
                            <MatchSlot partido={p} />
                          </div>
                        </Fragment>
                      ))}
                    </div>

                    {/* Connector to next column */}
                    {ci < cols.length - 1 && (
                      isSemis
                        ? <SemisConnector childCenters={centers[ci]} totalH={bracketH} terceroCY={TERCERO_CY} delay={ci * STEP + DRAW_OFFSET} />
                        : <Connector childCenters={centers[ci]} totalH={bracketH} delay={ci * STEP + DRAW_OFFSET} />
                    )}
                  </Fragment>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navegación por rondas (mobile) — enfoca y compacta el resto */}
      {canLeft && (
        <button
          type="button"
          onClick={() => focusOn(focusedCol - 1)}
          aria-label="Columna anterior"
          className="md:hidden absolute left-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-slate-900/85 border border-slate-700 text-green-400 shadow-lg backdrop-blur-sm active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => focusOn(focusedCol + 1)}
          aria-label="Siguiente columna"
          className="md:hidden absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-green-500 border border-green-400 text-black shadow-lg active:scale-90 transition-transform"
        >
          <svg className="chev-hint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────

export function TableroTab() {
  const [vista, setVista] = useState<'grupos' | 'llave'>('grupos')
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [desempatesAll, setDesempatesAll] = useState<Record<string, DesempatesGrupo>>({})
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  const fetchAll = () => {
    Promise.all([
      fetch('/api/partidos?fase=all').then(r => r.json()),
      fetch('/api/desempates').then(r => r.json()),
    ]).then(([data, desempates]: [Partido[], { grupo: string; equipo: string; orden: number }[]]) => {
      setPartidos(data)
      const map: Record<string, DesempatesGrupo> = {}
      for (const row of desempates) {
        if (!map[row.grupo]) map[row.grupo] = {}
        map[row.grupo][row.equipo] = row.orden
      }
      setDesempatesAll(map)
    }).catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/partidos?fase=all').then(r => r.json()),
      fetch('/api/desempates').then(r => r.json()),
    ]).then(([data, desempates]: [Partido[], { grupo: string; equipo: string; orden: number }[]]) => {
      setPartidos(data)
      const map: Record<string, DesempatesGrupo> = {}
      for (const row of desempates) {
        if (!map[row.grupo]) map[row.grupo] = {}
        map[row.grupo][row.equipo] = row.orden
      }
      setDesempatesAll(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Realtime: refresca el tablero cuando cambian los partidos
  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel('tablero-partidos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidos' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Toggle grupos / llave */}
      <div className="flex gap-2 p-3 border-b border-slate-800 shrink-0">
        {(['grupos', 'llave'] as const).map(v => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
              vista === v
                ? 'bg-green-500 text-black'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            {v === 'grupos' ? 'Grupos' : 'Llave'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vista === 'grupos' ? (
        <GruposView
          partidos={partidos.filter(p => p.fase === 'grupos')}
          desempatesAll={desempatesAll}
        />
      ) : (
        <LlaveView partidos={partidos.filter(p => p.fase !== 'grupos')} />
      )}
    </div>
  )
}
