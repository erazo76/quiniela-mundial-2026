'use client'
import { useState, useEffect } from 'react'
import { Partido } from '@/types'

// ─── Helpers ───────────────────────────────────────────────────────────────

interface Standing {
  equipo: string
  bandera: string | null
  pj: number; pg: number; pe: number; pp: number
  gf: number; gc: number; dif: number; pts: number
}

function calcularGrupo(partidos: Partido[]): Standing[] {
  const map: Record<string, Standing> = {}
  for (const p of partidos) {
    if (!map[p.equipo_local]) map[p.equipo_local] = { equipo: p.equipo_local, bandera: p.bandera_local, pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,dif:0,pts:0 }
    if (!map[p.equipo_visitante]) map[p.equipo_visitante] = { equipo: p.equipo_visitante, bandera: p.bandera_visitante, pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,dif:0,pts:0 }
    const rl = p.resultado_local, rv = p.resultado_visitante
    if (rl == null || rv == null) continue
    const L = map[p.equipo_local], V = map[p.equipo_visitante]
    L.pj++; V.pj++
    L.gf += rl; L.gc += rv; L.dif = L.gf - L.gc
    V.gf += rv; V.gc += rl; V.dif = V.gf - V.gc
    if (rl > rv)      { L.pg++; L.pts += 3; V.pp++ }
    else if (rl === rv){ L.pe++; L.pts++;    V.pe++; V.pts++ }
    else               { V.pg++; V.pts += 3; L.pp++ }
  }
  return Object.values(map).sort((a, b) => b.pts - a.pts || a.equipo.localeCompare(b.equipo))
}

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

function GrupoCard({ letra, partidos }: { letra: string; partidos: Partido[] }) {
  const rows = calcularGrupo(partidos)
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

function GruposView({ partidos }: { partidos: Partido[] }) {
  const GRUPOS = ['A','B','C','D','E','F','G','H','I','J','K','L']
  const byGrupo: Record<string, Partido[]> = {}
  for (const g of GRUPOS) byGrupo[g] = []
  for (const p of partidos) { if (p.grupo) byGrupo[p.grupo]?.push(p) }
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
      {GRUPOS.map(g => <GrupoCard key={g} letra={g} partidos={byGrupo[g] ?? []} />)}
    </div>
  )
}

// ─── Llave View ────────────────────────────────────────────────────────────

const FASES: { key: string; label: string }[] = [
  { key: 'dieciseisavos', label: 'Ronda de 32' },
  { key: 'octavos',       label: 'Octavos de final' },
  { key: 'cuartos',       label: 'Cuartos de final' },
  { key: 'semis',         label: 'Semifinales' },
  { key: 'final',         label: 'Final' },
]

function MatchSlot({ partido }: { partido: Partido }) {
  const hasResult = partido.resultado_local != null && partido.resultado_visitante != null
  const lWin = hasResult && partido.resultado_local! > partido.resultado_visitante!
  const vWin = hasResult && partido.resultado_visitante! > partido.resultado_local!

  function Row({ nombre, bandera, goles, win }: { nombre: string; bandera: string | null; goles: number | null; win: boolean }) {
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden w-[172px] shrink-0">
      <Row nombre={partido.equipo_local}     bandera={partido.bandera_local}     goles={partido.resultado_local}     win={lWin} />
      <div className="h-px bg-slate-800" />
      <Row nombre={partido.equipo_visitante} bandera={partido.bandera_visitante} goles={partido.resultado_visitante} win={vWin} />
    </div>
  )
}

function RondaCol({ label, partidos }: { label: string; partidos: Partido[] }) {
  return (
    <div className="flex flex-col shrink-0 w-[172px]">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">{label}</p>
      <div className="flex flex-col gap-3">
        {partidos.map(p => <MatchSlot key={p.id} partido={p} />)}
      </div>
    </div>
  )
}

function LlaveView({ partidos }: { partidos: Partido[] }) {
  const byFase: Record<string, Partido[]> = {}
  for (const f of FASES) byFase[f.key] = []
  for (const p of partidos) { if (byFase[p.fase]) byFase[p.fase].push(p) }
  const cols = FASES.filter(f => byFase[f.key].length > 0)

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex gap-5 items-start pb-4" style={{ minWidth: cols.length * 192 }}>
        {cols.map(f => (
          <RondaCol key={f.key} label={f.label} partidos={byFase[f.key]} />
        ))}
      </div>
    </div>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────

export function TableroTab() {
  const [vista, setVista] = useState<'grupos' | 'llave'>('grupos')
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/partidos?fase=all')
      .then(r => r.json())
      .then((data: Partido[]) => { setPartidos(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
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
        <GruposView partidos={partidos.filter(p => p.fase === 'grupos')} />
      ) : (
        <LlaveView partidos={partidos.filter(p => p.fase !== 'grupos')} />
      )}
    </div>
  )
}
