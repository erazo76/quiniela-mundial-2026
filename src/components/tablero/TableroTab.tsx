'use client'
import { useState, useEffect, Fragment, type CSSProperties } from 'react'
import { Partido } from '@/types'
import { calcularGrupo, DesempatesGrupo } from '@/lib/grupos'

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
const GAP0    = 12    // min gap between cards in the base round
const SLOT_H  = CARD_H + GAP0   // 64 px — height unit per match in base round
const CON_W   = 28    // width of the SVG connector strip between columns
const LABEL_H = 22    // px reserved above bracket for phase labels
const LINE    = '#39ff14'  // connector line color (electric green)

/** Top offset of a match card given its bracket round and position index */
function slotTop(round: number, idx: number): number {
  const p = Math.pow(2, round)
  return (idx * p + (p - 1) / 2) * SLOT_H
}

/** Vertical center of a match card */
function slotCenter(round: number, idx: number): number {
  return slotTop(round, idx) + CARD_H / 2
}

// ─── MatchSlot ─────────────────────────────────────────────────────────────

function MatchSlot({ partido }: { partido: Partido }) {
  const hasResult = partido.resultado_local != null && partido.resultado_visitante != null
  // esPenales cuando existen goles de penales registrados (resultado_local ya incluye el total)
  const esPenales = hasResult && partido.penales_local != null
  const lWin = hasResult && partido.resultado_local! > partido.resultado_visitante!
  const vWin = hasResult && partido.resultado_visitante! > partido.resultado_local!

  function Row({ nombre, bandera, goles, win, showPBadge }: {
    nombre: string; bandera: string | null; goles: number | null; win: boolean; showPBadge?: boolean
  }) {
    return (
      <div className={`relative flex items-center gap-1.5 px-2 py-[5px] ${win ? 'bg-green-500/10' : ''}`}>
        {showPBadge && (
          <span className="absolute bottom-0.5 right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-black text-[8px] font-black leading-none z-10">
            p
          </span>
        )}
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden w-[172px] shrink-0">
      <Row nombre={partido.equipo_local}     bandera={partido.bandera_local}     goles={partido.resultado_local}     win={lWin} showPBadge={esPenales && lWin} />
      <div className="h-px bg-slate-800" />
      <Row nombre={partido.equipo_visitante} bandera={partido.bandera_visitante} goles={partido.resultado_visitante} win={vWin} showPBadge={esPenales && vWin} />
    </div>
  )
}

// ─── Connector SVG ─────────────────────────────────────────────────────────

function Connector({ round, n, totalH }: { round: number; n: number; totalH: number }) {
  const mx = CON_W / 2
  const pairs = Math.floor(n / 2)
  return (
    <svg
      width={CON_W}
      height={totalH}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden
    >
      {Array.from({ length: pairs }, (_, j) => {
        const y1 = slotCenter(round, j * 2)
        const y2 = slotCenter(round, j * 2 + 1)
        const ym = (y1 + y2) / 2
        return (
          <g key={j} stroke={LINE} strokeWidth={1.5} fill="none" strokeLinecap="round">
            {/* horizontal from left match to midpoint */}
            <line x1={0} y1={y1} x2={mx} y2={y1} />
            {/* horizontal from left match to midpoint (bottom) */}
            <line x1={0} y1={y2} x2={mx} y2={y2} />
            {/* vertical bracket bar */}
            <line x1={mx} y1={y1} x2={mx} y2={y2} />
            {/* horizontal to right match */}
            <line x1={mx} y1={ym} x2={CON_W} y2={ym} />
          </g>
        )
      })}
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

function SemisConnector({ round, n, totalH, terceroCY }: {
  round: number; n: number; totalH: number; terceroCY: number
}) {
  const mx = CON_W / 2
  const pairs = Math.floor(n / 2)
  return (
    <svg width={CON_W} height={totalH} style={{ display: 'block', flexShrink: 0 }} aria-hidden>
      {Array.from({ length: pairs }, (_, j) => {
        const y1 = slotCenter(round, j * 2)
        const y2 = slotCenter(round, j * 2 + 1)
        const ym = (y1 + y2) / 2
        return (
          <g key={j}>
            {/* Winner path — solid green (same as regular Connector) */}
            <g stroke={LINE} strokeWidth={1.5} fill="none" strokeLinecap="round">
              <line x1={0} y1={y1} x2={mx} y2={y1} />
              <line x1={0} y1={y2} x2={mx} y2={y2} />
              <line x1={mx} y1={y1} x2={mx} y2={y2} />
              <line x1={mx} y1={ym} x2={CON_W} y2={ym} />
            </g>
            {/* Loser path — dashed slate, branches from winner midbar down to 3rd-place */}
            <g stroke="#475569" strokeWidth={1} fill="none" strokeLinecap="round" strokeDasharray="3 3">
              <line x1={mx} y1={ym} x2={mx} y2={terceroCY} />
              <line x1={mx} y1={terceroCY} x2={CON_W} y2={terceroCY} />
            </g>
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

// ─── LlaveView ─────────────────────────────────────────────────────────────

function LlaveView({ partidos }: { partidos: Partido[] }) {
  const byFase: Record<string, Partido[]> = {}
  for (const f of FASES) byFase[f.key] = []
  for (const p of partidos) {
    if (byFase[p.fase] !== undefined) byFase[p.fase].push(p)
  }
  byFase['tercer_puesto'] = partidos
    .filter(p => p.fase === 'tercer_puesto')
    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))

  const cols = FASES.filter(f => byFase[f.key].length > 0)
  const semisIdx = cols.findIndex(c => c.key === 'semis')
  const finalIdx = cols.findIndex(c => c.key === 'final')
  const hasTercer = byFase['tercer_puesto'].length > 0 && finalIdx >= 0

  // 3rd-place card sits just below the Final card in the same column
  const FINAL_Y    = finalIdx >= 0 ? slotTop(finalIdx, 0) : 0
  const TERCERO_Y  = FINAL_Y + CARD_H + 24         // top of 3rd-place card
  const TERCERO_CY = TERCERO_Y + CARD_H / 2        // center Y (for connector target)

  if (cols.length === 0 && !hasTercer) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Sin partidos de eliminatorias
      </div>
    )
  }

  const baseCount = cols.length > 0 ? byFase[cols[0].key].length : 0
  const totalH    = baseCount * SLOT_H
  // bracketH extends totalH to accommodate the 3rd-place card in the Final column
  const bracketH  = hasTercer ? Math.max(totalH, TERCERO_Y + CARD_H + 16) : totalH
  const mainMinW  = cols.length * CARD_W + Math.max(0, cols.length - 1) * CON_W

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
    <div className="flex-1 min-h-0 overflow-auto relative">
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
                const matches = byFase[fase.key]
                const isFinal = fase.key === 'final'
                const isSemis = ci === semisIdx && hasTercer

                return (
                  <Fragment key={fase.key}>
                    {/* Column */}
                    <div style={{ position: 'relative', width: CARD_W, height: bracketH, flexShrink: 0 }}>
                      <div style={LABEL_STYLE}>{fase.label}</div>

                      {matches.map((p, mi) => (
                        <div key={p.id} style={{ position: 'absolute', top: slotTop(ci, mi), left: 0 }}>
                          <MatchSlot partido={p} />
                        </div>
                      ))}

                      {/* 3rd-place card in the Final column */}
                      {isFinal && byFase['tercer_puesto'].map((p) => (
                        <Fragment key={p.id}>
                          <div style={{ ...LABEL_STYLE, position: 'absolute', top: TERCERO_Y - LABEL_H, left: 0, right: 0 }}>
                            3er Puesto
                          </div>
                          <div style={{ position: 'absolute', top: TERCERO_Y, left: 0 }}>
                            <MatchSlot partido={p} />
                          </div>
                        </Fragment>
                      ))}
                    </div>

                    {/* Connector to next column */}
                    {ci < cols.length - 1 && (
                      isSemis
                        ? <SemisConnector round={ci} n={matches.length} totalH={bracketH} terceroCY={TERCERO_CY} />
                        : <Connector round={ci} n={matches.length} totalH={bracketH} />
                    )}
                  </Fragment>
                )
              })}
            </div>
          </div>
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

  useEffect(() => {
    Promise.all([
      fetch('/api/partidos?fase=all').then(r => r.json()),
      fetch('/api/desempates').then(r => r.json()),
    ]).then(([partidos, desempates]: [Partido[], { grupo: string; equipo: string; orden: number }[]]) => {
      setPartidos(partidos)
      const map: Record<string, DesempatesGrupo> = {}
      for (const row of desempates) {
        if (!map[row.grupo]) map[row.grupo] = {}
        map[row.grupo][row.equipo] = row.orden
      }
      setDesempatesAll(map)
    }).catch(() => {}).finally(() => setLoading(false))
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
