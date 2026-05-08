/**
 * resolver-fase.ts
 *
 * Resuelve los placeholders del bracket automáticamente al finalizar cada partido:
 *
 *   Grupos      → actualiza "1A", "2B", "3°(ABCDF)" en dieciseisavos
 *   R32/O/C/S   → actualiza "Ganador D32-N", "Ganador ON", etc. en la siguiente fase
 *   Semis       → actualiza ganador en final Y perdedor en tercer_puesto
 *
 * El bracket de eliminación directa ya está codificado en los nombres de los partidos
 * de la DB (equipo_local/visitante = "Ganador D32-1", etc.), así que no se hardcodea
 * nada en este archivo más allá de los prefijos de cada fase.
 *
 * Para la asignación de terceros se usa un matching bipartito simple dado que
 * FIFA publica una tabla de 495 combinaciones posibles que no tenemos disponible.
 * Si el orden difiere del oficial, el admin puede corregirlo editando equipo_local/
 * visitante directamente desde la base de datos o cuando se implemente edición manual.
 */

import { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface PartidoDB {
  id: string
  equipo_local: string
  equipo_visitante: string
  resultado_local: number | null
  resultado_visitante: number | null
  estado: string
  fase: string
  grupo: string | null
}

interface Entrada {
  equipo: string
  grupo: string
  pts: number
  gf: number
  gc: number
  dg: number
}

// ---------------------------------------------------------------------------
// Punto de entrada principal
// ---------------------------------------------------------------------------

export async function resolverTrasResultado(
  supabase: SupabaseClient,
  partidoId: string,
  ganadorManual?: string // solo requerido cuando termina en empate en eliminatoria
): Promise<void> {
  const { data: partido, error } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, resultado_local, resultado_visitante, estado, fase, grupo, ganador')
    .eq('id', partidoId)
    .single()

  if (error || !partido || partido.estado !== 'finalizado') return

  // Determinar el ganador del partido
  let ganador: string | null = null

  if (partido.resultado_local != null && partido.resultado_visitante != null) {
    if (partido.resultado_local > partido.resultado_visitante) {
      ganador = partido.equipo_local
    } else if (partido.resultado_visitante > partido.resultado_local) {
      ganador = partido.equipo_visitante
    } else {
      // Empate: en grupos no hay ganador; en eliminatoria el admin lo indica
      ganador = ganadorManual ?? null
    }
  }

  // Persistir el ganador en la DB
  if (ganador && ganador !== partido.ganador) {
    await supabase.from('partidos').update({ ganador }).eq('id', partidoId)
  }

  if (partido.fase === 'grupos') {
    if (partido.grupo) {
      await resolverGrupoSiCompleto(supabase, partido.grupo)
    }
  } else {
    if (ganador) {
      await resolverKnockout(supabase, partido as PartidoDB, ganador)
    }
  }
}

// ---------------------------------------------------------------------------
// Eliminatorias: actualizar placeholder en la fase siguiente
// ---------------------------------------------------------------------------

async function resolverKnockout(
  supabase: SupabaseClient,
  partido: PartidoDB,
  ganador: string
): Promise<void> {
  const perdedor =
    ganador === partido.equipo_local ? partido.equipo_visitante : partido.equipo_local

  // Posición de este partido dentro de su fase (orden por fecha_hora)
  const { data: faseMatches } = await supabase
    .from('partidos')
    .select('id')
    .eq('fase', partido.fase)
    .order('fecha_hora', { ascending: true })

  const pos = (faseMatches ?? []).findIndex((m) => m.id === partido.id) + 1
  if (pos === 0) return

  type FaseConfig = {
    ganadorPH: string
    nextFase: string
    perdedorPH?: string
    perdedorFase?: string
  }

  const config: Record<string, FaseConfig> = {
    dieciseisavos: { ganadorPH: `Ganador D32-${pos}`,  nextFase: 'octavos' },
    octavos:       { ganadorPH: `Ganador O${pos}`,     nextFase: 'cuartos' },
    cuartos:       { ganadorPH: `Ganador C${pos}`,     nextFase: 'semis' },
    semis: {
      ganadorPH:   `Ganador S${pos}`,  nextFase: 'final',
      perdedorPH:  `Perdedor S${pos}`, perdedorFase: 'tercer_puesto',
    },
  }

  const cfg = config[partido.fase]
  if (!cfg) return

  await reemplazarPlaceholder(supabase, cfg.nextFase, cfg.ganadorPH, ganador)

  if (cfg.perdedorPH && cfg.perdedorFase) {
    await reemplazarPlaceholder(supabase, cfg.perdedorFase, cfg.perdedorPH, perdedor)
  }
}

async function reemplazarPlaceholder(
  supabase: SupabaseClient,
  fase: string,
  placeholder: string,
  equipo: string
): Promise<void> {
  // Look up the flag for this team from any existing match
  const bandera = await buscarBandera(supabase, equipo)

  // local
  const { data: local } = await supabase
    .from('partidos')
    .select('id, ganador')
    .eq('fase', fase)
    .eq('equipo_local', placeholder)
    .maybeSingle()
  if (local) {
    const upd: Record<string, string | null> = { equipo_local: equipo, bandera_local: bandera }
    if (local.ganador === placeholder) upd.ganador = equipo
    await supabase.from('partidos').update(upd).eq('id', local.id)
  }

  // visitante
  const { data: visit } = await supabase
    .from('partidos')
    .select('id, ganador')
    .eq('fase', fase)
    .eq('equipo_visitante', placeholder)
    .maybeSingle()
  if (visit) {
    const upd: Record<string, string | null> = { equipo_visitante: equipo, bandera_visitante: bandera }
    if (visit.ganador === placeholder) upd.ganador = equipo
    await supabase.from('partidos').update(upd).eq('id', visit.id)
  }
}

async function buscarBandera(supabase: SupabaseClient, equipo: string): Promise<string | null> {
  const { data: asLocal } = await supabase
    .from('partidos')
    .select('bandera_local')
    .eq('equipo_local', equipo)
    .not('bandera_local', 'is', null)
    .limit(1)
    .maybeSingle()
  if (asLocal?.bandera_local) return asLocal.bandera_local

  const { data: asVisit } = await supabase
    .from('partidos')
    .select('bandera_visitante')
    .eq('equipo_visitante', equipo)
    .not('bandera_visitante', 'is', null)
    .limit(1)
    .maybeSingle()
  return asVisit?.bandera_visitante ?? null
}

// ---------------------------------------------------------------------------
// Grupos: calcular tabla y resolver dieciseisavos cuando el grupo termina
// ---------------------------------------------------------------------------

async function resolverGrupoSiCompleto(
  supabase: SupabaseClient,
  grupo: string
): Promise<void> {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, resultado_local, resultado_visitante, estado, fase, grupo')
    .eq('fase', 'grupos')
    .eq('grupo', grupo)

  if (!matches?.length) return

  // Cada grupo tiene 6 partidos (C(4,2) = 6)
  const total = matches.length
  const finalizados = matches.filter((m) => m.estado === 'finalizado').length
  if (finalizados < total || total < 6) return

  const tabla = calcularTabla(matches as PartidoDB[])
  if (tabla.length < 3) return

  const [primero, segundo] = tabla

  // Actualizar 1° y 2° en dieciseisavos
  await reemplazarPlaceholder(supabase, 'dieciseisavos', `1${grupo}`, primero.equipo)
  await reemplazarPlaceholder(supabase, 'dieciseisavos', `2${grupo}`, segundo.equipo)

  // Intentar resolver los terceros (solo cuando todos los grupos terminaron)
  await resolverTodosTerceros(supabase)
}

// ---------------------------------------------------------------------------
// Terceros puestos: ranking cuando TODOS los grupos finalizaron
// ---------------------------------------------------------------------------

async function resolverTodosTerceros(supabase: SupabaseClient): Promise<void> {
  const { data: allMatches } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, resultado_local, resultado_visitante, estado, fase, grupo')
    .eq('fase', 'grupos')

  if (!allMatches?.length) return

  const grupos = [...new Set(allMatches.map((m) => m.grupo).filter(Boolean))] as string[]

  // Verificar que todos los grupos estén completos
  for (const g of grupos) {
    const gMatches = allMatches.filter((m) => m.grupo === g)
    if (gMatches.length < 6 || gMatches.some((m) => m.estado !== 'finalizado')) return
  }

  // Calcular tabla de cada grupo y extraer el 3° puesto
  const terceros: Array<Entrada & { grupo: string }> = []

  for (const g of grupos) {
    const gMatches = allMatches.filter((m) => m.grupo === g)
    const tabla = calcularTabla(gMatches as PartidoDB[])
    if (tabla.length >= 3) {
      terceros.push({ ...tabla[2], grupo: g })
    }
  }

  // Ordenar por rendimiento y tomar los 8 mejores
  terceros.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.dg !== a.dg) return b.dg - a.dg
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.grupo.localeCompare(b.grupo)
  })

  const top8 = terceros.slice(0, 8)

  // Obtener los slots de dieciseisavos con placeholder 3°(...)
  const { data: slots } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante')
    .eq('fase', 'dieciseisavos')

  if (!slots) return

  // Recopilar slots con placeholder de terceros
  type Slot = { id: string; campo: 'equipo_local' | 'equipo_visitante'; grupos: string[] }
  const terceroSlots: Slot[] = []

  for (const p of slots) {
    for (const campo of ['equipo_local', 'equipo_visitante'] as const) {
      const valor = p[campo] as string
      const match = valor.match(/^3°\(([A-L]+)\)$/)
      if (match) {
        terceroSlots.push({ id: p.id, campo, grupos: match[1].split('') })
      }
    }
  }

  if (terceroSlots.length !== 8) return // Bracket no configurado aún

  // Matching bipartito: asignar cada tercero clasificado a un slot válido
  // (el grupo del tercero debe estar en la lista de grupos del slot)
  const assignment = new Map<string, { id: string; campo: string }>() // equipo → slot
  const usedSlots = new Set<string>()

  const ok = asignarTerceros(terceroSlots, top8, assignment, usedSlots)
  if (!ok) return // No se encontró asignación válida (no debería ocurrir)

  // Aplicar en DB
  for (const [equipo, slot] of assignment.entries()) {
    await supabase
      .from('partidos')
      .update({ [slot.campo]: equipo })
      .eq('id', slot.id)
  }
}

/**
 * Backtracking para asignar cada tercero a un slot cuyo grupo sea válido.
 * Procesa los terceros en orden de rendimiento (mejor primero) para priorizar
 * su asignación a slots con más opciones disponibles.
 */
function asignarTerceros(
  slots: Array<{ id: string; campo: string; grupos: string[] }>,
  terceros: Array<Entrada & { grupo: string }>,
  assignment: Map<string, { id: string; campo: string }>,
  usedSlots: Set<string>
): boolean {
  if (terceros.length === 0) return true

  const [tercero, ...rest] = terceros
  const slotKey = (s: { id: string; campo: string }) => `${s.id}:${s.campo}`

  for (const slot of slots) {
    const key = slotKey(slot)
    if (usedSlots.has(key)) continue
    if (!slot.grupos.includes(tercero.grupo)) continue

    assignment.set(tercero.equipo, { id: slot.id, campo: slot.campo })
    usedSlots.add(key)

    if (asignarTerceros(slots, rest, assignment, usedSlots)) return true

    assignment.delete(tercero.equipo)
    usedSlots.delete(key)
  }

  return false
}

// ---------------------------------------------------------------------------
// Tabla de grupo (puntos, DG, GF + desempate head-to-head)
// ---------------------------------------------------------------------------

function calcularTabla(matches: PartidoDB[]): Entrada[] {
  const stats = new Map<string, Entrada>()

  function getOrInit(equipo: string): Entrada {
    if (!stats.has(equipo)) {
      stats.set(equipo, { equipo, grupo: '', pts: 0, gf: 0, gc: 0, dg: 0 })
    }
    return stats.get(equipo)!
  }

  for (const m of matches) {
    if (m.resultado_local == null || m.resultado_visitante == null) continue

    const local = getOrInit(m.equipo_local)
    const visit = getOrInit(m.equipo_visitante)
    const rl = m.resultado_local
    const rv = m.resultado_visitante

    local.gf += rl; local.gc += rv; local.dg = local.gf - local.gc
    visit.gf += rv; visit.gc += rl; visit.dg = visit.gf - visit.gc

    if (rl > rv)      { local.pts += 3 }
    else if (rl < rv) { visit.pts += 3 }
    else              { local.pts += 1; visit.pts += 1 }
  }

  const equipos = [...stats.values()]

  // Ordenar: puntos → DG → GF; desempate head-to-head entre empatados
  equipos.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.dg !== a.dg) return b.dg - a.dg
    if (b.gf !== a.gf) return b.gf - a.gf

    // Desempate directo entre A y B
    const directos = matches.filter(
      (m) =>
        (m.equipo_local === a.equipo && m.equipo_visitante === b.equipo) ||
        (m.equipo_local === b.equipo && m.equipo_visitante === a.equipo)
    )
    for (const d of directos) {
      if (d.resultado_local == null || d.resultado_visitante == null) continue
      const localA = d.equipo_local === a.equipo
      const golesA = localA ? d.resultado_local : d.resultado_visitante
      const golesB = localA ? d.resultado_visitante : d.resultado_local
      if (golesA !== golesB) return golesB - golesA // B gana → B primero
    }

    return a.equipo.localeCompare(b.equipo) // último desempate: alfabético
  })

  return equipos
}
