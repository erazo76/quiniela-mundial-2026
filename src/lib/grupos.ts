import { Partido } from '@/types'

export interface Standing {
  equipo: string
  bandera: string | null
  pj: number; pg: number; pe: number; pp: number
  gf: number; gc: number; dif: number; pts: number
}

// { equipo -> orden_manual } within a single group (1-indexed)
export type DesempatesGrupo = Record<string, number>

function buildMap(partidos: Partido[]): Record<string, Standing> {
  const map: Record<string, Standing> = {}
  for (const p of partidos) {
    if (!map[p.equipo_local])
      map[p.equipo_local] = { equipo: p.equipo_local, bandera: p.bandera_local, pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,dif:0,pts:0 }
    if (!map[p.equipo_visitante])
      map[p.equipo_visitante] = { equipo: p.equipo_visitante, bandera: p.bandera_visitante, pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,dif:0,pts:0 }
    const rl = p.resultado_local, rv = p.resultado_visitante
    if (rl == null || rv == null) continue
    const L = map[p.equipo_local], V = map[p.equipo_visitante]
    L.pj++; V.pj++
    L.gf += rl; L.gc += rv; L.dif = L.gf - L.gc
    V.gf += rv; V.gc += rl; V.dif = V.gf - V.gc
    if (rl > rv)       { L.pg++; L.pts += 3; V.pp++ }
    else if (rl === rv) { L.pe++; L.pts++;    V.pe++; V.pts++ }
    else               { V.pg++; V.pts += 3; L.pp++ }
  }
  return map
}

function h2hStats(
  tied: string[],
  partidos: Partido[]
): Record<string, { pts: number; dif: number; gf: number }> {
  const set = new Set(tied)
  const stats: Record<string, { pts: number; dif: number; gf: number }> = {}
  for (const e of tied) stats[e] = { pts: 0, dif: 0, gf: 0 }
  for (const p of partidos) {
    if (!set.has(p.equipo_local) || !set.has(p.equipo_visitante)) continue
    if (p.resultado_local == null || p.resultado_visitante == null) continue
    const rl = p.resultado_local, rv = p.resultado_visitante
    stats[p.equipo_local].gf  += rl
    stats[p.equipo_local].dif += rl - rv
    stats[p.equipo_visitante].gf  += rv
    stats[p.equipo_visitante].dif += rv - rl
    if (rl > rv)       stats[p.equipo_local].pts += 3
    else if (rl === rv) { stats[p.equipo_local].pts++; stats[p.equipo_visitante].pts++ }
    else               stats[p.equipo_visitante].pts += 3
  }
  return stats
}

function resolveSubgroup(
  group: Standing[],
  partidos: Partido[],
  desempates: DesempatesGrupo
): Standing[] {
  if (group.length === 1) return group

  // Criteria 4-6: H2H pts, H2H goal diff, H2H goals scored
  const h2h = h2hStats(group.map(s => s.equipo), partidos)
  const sorted = [...group].sort((a, b) => {
    const ha = h2h[a.equipo], hb = h2h[b.equipo]
    return hb.pts - ha.pts || hb.dif - ha.dif || hb.gf - ha.gf
  })

  const result: Standing[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    const hi = h2h[sorted[i].equipo]
    while (j < sorted.length) {
      const hj = h2h[sorted[j].equipo]
      if (hj.pts !== hi.pts || hj.dif !== hi.dif || hj.gf !== hi.gf) break
      j++
    }
    const sub = sorted.slice(i, j)
    if (sub.length === 1) {
      result.push(sub[0])
    } else {
      // Criteria 7-8: manual order set by admin (alphabetical fallback)
      result.push(...sub.sort((a, b) => {
        const oa = desempates[a.equipo] ?? Infinity
        const ob = desempates[b.equipo] ?? Infinity
        return oa !== ob ? oa - ob : a.equipo.localeCompare(b.equipo)
      }))
    }
    i = j
  }
  return result
}

// Full FIFA sort: criteria 1-3 global, 4-6 H2H, 7-8 manual
export function calcularGrupo(
  partidos: Partido[],
  desempates: DesempatesGrupo = {}
): Standing[] {
  const sorted = Object.values(buildMap(partidos)).sort((a, b) =>
    b.pts - a.pts || b.dif - a.dif || b.gf - a.gf
  )

  const result: Standing[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    while (j < sorted.length &&
      sorted[j].pts === sorted[i].pts &&
      sorted[j].dif === sorted[i].dif &&
      sorted[j].gf === sorted[i].gf) {
      j++
    }
    result.push(...resolveSubgroup(sorted.slice(i, j), partidos, desempates))
    i = j
  }
  return result
}

// Returns arrays of team names still tied after criteria 1-6 (need manual resolution)
export function getEmpatadosSinResolver(partidos: Partido[]): string[][] {
  const sorted = Object.values(buildMap(partidos)).sort((a, b) =>
    b.pts - a.pts || b.dif - a.dif || b.gf - a.gf
  )

  const result: string[][] = []
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    while (j < sorted.length &&
      sorted[j].pts === sorted[i].pts &&
      sorted[j].dif === sorted[i].dif &&
      sorted[j].gf === sorted[i].gf) {
      j++
    }
    const group = sorted.slice(i, j)
    if (group.length > 1) {
      const h2h = h2hStats(group.map(s => s.equipo), partidos)
      const sortedH2H = [...group].sort((a, b) => {
        const ha = h2h[a.equipo], hb = h2h[b.equipo]
        return hb.pts - ha.pts || hb.dif - ha.dif || hb.gf - ha.gf
      })
      let k = 0
      while (k < sortedH2H.length) {
        let l = k + 1
        const hk = h2h[sortedH2H[k].equipo]
        while (l < sortedH2H.length) {
          const hl = h2h[sortedH2H[l].equipo]
          if (hl.pts !== hk.pts || hl.dif !== hk.dif || hl.gf !== hk.gf) break
          l++
        }
        if (l - k > 1) result.push(sortedH2H.slice(k, l).map(s => s.equipo))
        k = l
      }
    }
    i = j
  }
  return result
}
