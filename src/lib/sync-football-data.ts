import { SupabaseClient } from '@supabase/supabase-js'
import { procesarResultadoPartido, reprocesarResultadoPartido } from './calcular-resultado'
import { resolverTrasResultado } from './resolver-fase'

const TEAM_MAP: Record<string, string> = {
  Argentina: 'Argentina',
  Brazil: 'Brasil',
  France: 'Francia',
  Spain: 'España',
  Germany: 'Alemania',
  England: 'Inglaterra',
  Portugal: 'Portugal',
  Netherlands: 'Países Bajos',
  Belgium: 'Bélgica',
  Croatia: 'Croacia',
  Uruguay: 'Uruguay',
  Colombia: 'Colombia',
  Mexico: 'México',
  'United States': 'Estados Unidos',
  Canada: 'Canadá',
  Morocco: 'Marruecos',
  Senegal: 'Senegal',
  Japan: 'Japón',
  'Korea Republic': 'Corea del Sur',
  'South Korea': 'Corea del Sur',
  Australia: 'Australia',
  'Saudi Arabia': 'Arabia Saudita',
  Iran: 'Irán',
  Egypt: 'Egipto',
  Ghana: 'Ghana',
  "Côte d'Ivoire": 'Costa de Marfil',
  'Ivory Coast': 'Costa de Marfil',
  Algeria: 'Argelia',
  Tunisia: 'Túnez',
  Ecuador: 'Ecuador',
  Paraguay: 'Paraguay',
  Switzerland: 'Suiza',
  Turkey: 'Turquía',
  Scotland: 'Escocia',
  'New Zealand': 'Nueva Zelanda',
  Panama: 'Panamá',
  Qatar: 'Catar',
  'South Africa': 'Sudáfrica',
  'Czech Republic': 'República Checa',
  Czechia: 'República Checa',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina',
  Haiti: 'Haití',
  'Curaçao': 'Curazao',
  Iraq: 'Irak',
  Jordan: 'Jordania',
  Uzbekistan: 'Uzbekistán',
  'Cape Verde': 'Cabo Verde',
  'Cape Verde Islands': 'Cabo Verde',
  Sweden: 'Suecia',
  Austria: 'Austria',
  Norway: 'Noruega',
  'DR Congo': 'República Democrática del Congo',
  'Congo DR': 'República Democrática del Congo',
}

// fetch a football-data.org con reintentos ante fallos de red transitorios.
// La API gratuita se cae/limita seguido desde IPs de Vercel y lanza
// "TypeError: fetch failed"; sin esto un blip aborta toda la sincronización.
async function fetchFootballData(
  url: string,
  apiKey: string,
  intentos = 3
): Promise<Response | null> {
  for (let i = 0; i < intentos; i++) {
    try {
      return await fetch(url, { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' })
    } catch {
      if (i < intentos - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)))
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// ESPN — fuente autoritativa para eliminatorias (regulación + tanda de penales)
// ─────────────────────────────────────────────────────────────────────────────
//
// El plan gratuito de football-data carga la tanda de penales de forma tardía e
// inconsistente (llega a devolver penalties empatados 3-3 y winner null), así que
// un cruce definido por penales puede quedar guardado como empate sin ganador y
// trabar el bracket. ESPN expone un endpoint JSON público (sin API key) que trae
// la regulación (`score`) y la tanda (`shootoutScore`) por equipo, más un estado
// `status.type.completed`. Para fases de eliminación ESPN manda sobre football-data.
interface EspnCompetitor {
  homeAway: string
  score: string
  shootoutScore: number | null
  team: { displayName?: string; name?: string }
}
interface EspnEvent {
  status?: { type?: { completed?: boolean } }
  competitions?: Array<{ competitors?: EspnCompetitor[] }>
}

function fechaYmd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
}

// Eventos ESPN de una fecha (YYYYMMDD), memoizados por corrida.
async function fetchEspnEventos(fecha: string, cache: Map<string, EspnEvent[]>): Promise<EspnEvent[]> {
  if (cache.has(fecha)) return cache.get(fecha)!
  let eventos: EspnEvent[] = []
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${fecha}`,
      { cache: 'no-store' }
    )
    if (res.ok) {
      const data = (await res.json()) as { events?: EspnEvent[] }
      eventos = data.events ?? []
    }
  } catch {
    eventos = []
  }
  cache.set(fecha, eventos)
  return eventos
}

interface EspnResuelto {
  regLocal: number
  regVisit: number
  penLocal: number | null
  penVisit: number | null
  ganadorSide: 'local' | 'visitante'
}

// Resuelve un cruce de eliminatoria desde ESPN, mapeado a NUESTRA orientación
// local/visitante. Devuelve null si ESPN no tiene el partido cerrado o no lo halla.
async function resolverConEspn(
  localEs: string,
  visitanteEs: string,
  fechaHora: string,
  cache: Map<string, EspnEvent[]>
): Promise<EspnResuelto | null> {
  const base = new Date(fechaHora)
  // ESPN agrupa por fecha local (US), que puede ir un día detrás del kickoff UTC.
  const fechas = [fechaYmd(base), fechaYmd(new Date(base.getTime() - 24 * 60 * 60 * 1000))]

  for (const fecha of fechas) {
    const eventos = await fetchEspnEventos(fecha, cache)
    for (const ev of eventos) {
      const comps = ev.competitions?.[0]?.competitors
      if (!comps?.length) continue
      const home = comps.find((c) => c.homeAway === 'home')
      const away = comps.find((c) => c.homeAway === 'away')
      if (!home || !away) continue

      const homeName = home.team?.displayName ?? home.team?.name ?? ''
      const awayName = away.team?.displayName ?? away.team?.name ?? ''
      const homeEs = TEAM_MAP[homeName] ?? homeName
      const awayEs = TEAM_MAP[awayName] ?? awayName

      const directo = homeEs === localEs && awayEs === visitanteEs
      const inverso = homeEs === visitanteEs && awayEs === localEs
      if (!directo && !inverso) continue

      if (!ev.status?.type?.completed) return null // ESPN aún no lo cerró

      const homeReg = Number(home.score)
      const awayReg = Number(away.score)
      if (!Number.isFinite(homeReg) || !Number.isFinite(awayReg)) return null
      const homePen = home.shootoutScore != null ? Number(home.shootoutScore) : null
      const awayPen = away.shootoutScore != null ? Number(away.shootoutScore) : null

      const regLocal = directo ? homeReg : awayReg
      const regVisit = directo ? awayReg : homeReg
      const penLocal = directo ? homePen : awayPen
      const penVisit = directo ? awayPen : homePen

      let ganadorSide: 'local' | 'visitante'
      if (penLocal != null && penVisit != null && penLocal !== penVisit) {
        ganadorSide = penLocal > penVisit ? 'local' : 'visitante'
      } else if (regLocal !== regVisit) {
        ganadorSide = regLocal > regVisit ? 'local' : 'visitante'
      } else {
        return null // empate sin tanda resuelta
      }

      return { regLocal, regVisit, penLocal, penVisit, ganadorSide }
    }
  }
  return null
}

// NOTA: se eliminó `syncEquiposEliminatorias`. Llenaba los equipos de eliminatorias
// copiándolos del API football-data, pero hacía match contra nuestras filas SOLO por
// fecha+fase; como hay 2-3 partidos por día, el `.find()` siempre devolvía la primera
// fila de esa fecha y varios cruces del API se escribían sobre la MISMA fila,
// pisándose y dejando equipos duplicados/desubicados. Además el API trae los cruces
// del Mundial real, inconsistentes con el bracket que surge de NUESTROS grupos. El
// bracket es responsabilidad exclusiva de `resolver-fase.ts` (única fuente de verdad).
// Aquí solo se sincronizan RESULTADOS, nunca asignaciones de equipos del bracket.

// Marca como "en_vivo" los partidos pendientes cuyo kickoff ya pasó, sin
// depender del estado IN_PLAY de la API (el plan gratuito de football-data
// tarda en reflejar IN_PLAY → un partido ya empezado se quedaba 'pendiente').
// Como complemento se usa IN_PLAY/PAUSED de la API para cubrir partidos cuyo
// fecha_hora en la DB no coincida con el kickoff real. El paso en_vivo →
// finalizado ya lo cubre el flujo principal de resultados. Idempotente.
async function marcarPartidosEnVivo(
  supabase: SupabaseClient,
  apiKey: string
): Promise<number> {
  const ahora = new Date().toISOString()
  const ids = new Set<string>()

  // 1) Por horario: todo partido pendiente cuyo inicio ya pasó.
  const { data: porHorario } = await supabase
    .from('partidos')
    .select('id')
    .eq('estado', 'pendiente')
    .lte('fecha_hora', ahora)

  for (const p of porHorario ?? []) ids.add(p.id)

  // 2) Complemento por API IN_PLAY/PAUSED: cubre partidos cuyo fecha_hora en
  //    la DB no coincida con el kickoff real reportado por la API.
  //    IMPORTANTE: solo se consideran partidos cuyo fecha_hora (nuestro, que es
  //    el autoritativo) ya pasó. Así un retraso cargado a mano (p.ej. por clima)
  //    NO se pisa con el IN_PLAY viejo/erróneo de la API, que suele reflejar el
  //    kickoff programado original y no la suspensión real.
  const res = await fetchFootballData(
    'https://api.football-data.org/v4/competitions/WC/matches?status=IN_PLAY,PAUSED',
    apiKey
  )
  if (res && res.ok) {
    const data = await res.json()
    const partidosApi: Array<{ homeTeam: { name: string }; awayTeam: { name: string } }> =
      data.matches ?? []
    if (partidosApi.length) {
      const { data: pendientes } = await supabase
        .from('partidos')
        .select('id, equipo_local, equipo_visitante')
        .eq('estado', 'pendiente')
        .lte('fecha_hora', ahora)

      for (const partido of partidosApi) {
        const localEs = TEAM_MAP[partido.homeTeam.name] ?? partido.homeTeam.name
        const visitanteEs = TEAM_MAP[partido.awayTeam.name] ?? partido.awayTeam.name
        const nuestro = (pendientes ?? []).find(
          (p) => p.equipo_local === localEs && p.equipo_visitante === visitanteEs
        )
        if (nuestro) ids.add(nuestro.id)
      }
    }
  }

  if (!ids.size) return 0

  // Escritura batch única (idempotente con el filtro estado='pendiente').
  const { error, count } = await supabase
    .from('partidos')
    .update({ estado: 'en_vivo' }, { count: 'exact' })
    .in('id', Array.from(ids))
    .eq('estado', 'pendiente')

  if (error) return 0
  return count ?? 0
}

// Ventana para revalidar partidos ya finalizados contra la API: si la API
// corrigió un marcador provisional (gol anulado por VAR, etc.) dentro de este
// plazo, el cron lo detecta y re-scorea. Solo aplica a fase de grupos: en
// eliminatorias los penales/ganador suelen cargarse a mano y no deben pisarse.
const VENTANA_REVALIDACION_MS = 4 * 24 * 60 * 60 * 1000

export async function syncResultadosFootballData(
  supabase: SupabaseClient
): Promise<{ sincronizados: number; corregidos?: number; equiposActualizados?: number; enVivo?: number; mensaje?: string; errores?: string[] }> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return { sincronizados: 0, mensaje: 'FOOTBALL_DATA_API_KEY no configurado' }

  // El bracket de eliminatorias lo arma `resolver-fase.ts` desde nuestros resultados;
  // este sync NO debe tocar las asignaciones de equipos (ver nota arriba).
  const equiposActualizados = 0

  // Marcar partidos en vivo. Aislado: su fallo no debe abortar los resultados.
  let enVivo = 0
  try {
    enVivo = await marcarPartidosEnVivo(supabase, apiKey)
  } catch {
    enVivo = 0
  }

  const fdRes = await fetchFootballData(
    'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED',
    apiKey
  )

  if (!fdRes) {
    return {
      sincronizados: 0,
      equiposActualizados: equiposActualizados || undefined,
      enVivo: enVivo || undefined,
      mensaje: 'No se pudo conectar con la API tras varios intentos. Reintentar en la próxima corrida.',
    }
  }

  if (!fdRes.ok) {
    return {
      sincronizados: 0,
      equiposActualizados: equiposActualizados || undefined,
      enVivo: enVivo || undefined,
      mensaje: `API no disponible (HTTP ${fdRes.status}). El Mundial 2026 aún no ha comenzado o verifica la clave API.`,
    }
  }

  const fdData = await fdRes.json()
  const partidosApi: Array<{
    homeTeam: { name: string }
    awayTeam: { name: string }
    score: {
      fullTime: { home: number | null; away: number | null }
      penalties: { home: number | null; away: number | null } | null
    }
  }> = fdData.matches ?? []

  if (!partidosApi.length) {
    return {
      sincronizados: 0,
      equiposActualizados: equiposActualizados || undefined,
      enVivo: enVivo || undefined,
      mensaje: 'Sin partidos finalizados en la API',
    }
  }

  // Candidatos: pendientes/en_vivo (para finalizar) + finalizados RECIENTES de
  // grupos (para revalidar por si la API corrigió un marcador provisional).
  const desdeRevalidacion = new Date(Date.now() - VENTANA_REVALIDACION_MS).toISOString()

  const { data: pendientes, error: errDB } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, estado, resultado_local, resultado_visitante, fase, fecha_hora')
    .in('estado', ['pendiente', 'en_vivo'])

  if (errDB) throw new Error(errDB.message)

  const { data: finalizadosRecientes } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, estado, resultado_local, resultado_visitante, fase, fecha_hora')
    .eq('estado', 'finalizado')
    .eq('fase', 'grupos')
    .gte('fecha_hora', desdeRevalidacion)

  const nuestrosPartidos = [...(pendientes ?? []), ...(finalizadosRecientes ?? [])]

  if (!nuestrosPartidos.length) {
    return {
      sincronizados: 0,
      equiposActualizados: equiposActualizados || undefined,
      enVivo: enVivo || undefined,
      mensaje: 'No hay partidos pendientes',
    }
  }

  let sincronizados = 0
  let corregidos = 0
  const errores: string[] = []
  const espnCache = new Map<string, EspnEvent[]>()

  for (const partido of partidosApi) {
    const localMapeado = TEAM_MAP[partido.homeTeam.name] ?? partido.homeTeam.name
    const visitanteMapeado = TEAM_MAP[partido.awayTeam.name] ?? partido.awayTeam.name
    const ftLocal = partido.score.fullTime.home
    const ftVisitante = partido.score.fullTime.away

    if (ftLocal == null || ftVisitante == null) continue

    const nuestroPartido = nuestrosPartidos.find(
      (p) => p.equipo_local === localMapeado && p.equipo_visitante === visitanteMapeado
    )
    if (!nuestroPartido) continue

    // Penales: solo aplican si la regulación terminó empatada
    const pen = partido.score.penalties
    const penLocal = ftLocal === ftVisitante && pen?.home != null ? pen.home : null
    const penVisitante = ftLocal === ftVisitante && pen?.away != null ? pen.away : null
    const totalLocal = ftLocal + (penLocal ?? 0)
    const totalVisitante = ftVisitante + (penVisitante ?? 0)

    // ── Revalidación de un partido YA finalizado ──────────────────────────────
    if (nuestroPartido.estado === 'finalizado') {
      // Sin cambios respecto a lo guardado → nada que hacer.
      if (
        nuestroPartido.resultado_local === totalLocal &&
        nuestroPartido.resultado_visitante === totalVisitante
      ) {
        continue
      }

      const updateFin: Record<string, unknown> = {
        resultado_local: totalLocal,
        resultado_visitante: totalVisitante,
      }
      if (penLocal != null) {
        updateFin.penales_local = penLocal
        updateFin.penales_visitante = penVisitante
      }

      const { error: errUpd } = await supabase
        .from('partidos')
        .update(updateFin)
        .eq('id', nuestroPartido.id)
      if (errUpd) {
        errores.push(`Revalidar ${localMapeado} vs ${visitanteMapeado}: ${errUpd.message}`)
        continue
      }

      const { error: errRe } = await reprocesarResultadoPartido(
        supabase,
        nuestroPartido.id,
        totalLocal,
        totalVisitante,
        localMapeado,
        visitanteMapeado
      )
      if (errRe) {
        errores.push(`Reproceso ${localMapeado} vs ${visitanteMapeado}: ${errRe}`)
        continue
      }

      await resolverTrasResultado(supabase, nuestroPartido.id)
      corregidos++
      continue
    }

    // ── Finalización normal (pendiente/en_vivo → finalizado) ───────────────────
    // Valores a guardar (por defecto, los de football-data).
    let finLocal = totalLocal
    let finVisit = totalVisitante
    let finPenLocal = penLocal
    let finPenVisit = penVisitante

    // Eliminatorias: ESPN es autoritativa. Si resuelve el cruce (regulación + tanda),
    // manda sobre football-data. Si NO resuelve y football-data tampoco da un ganador
    // claro (empate sin penales), NO se finaliza: se reintenta en la próxima corrida.
    const esEliminatoria = nuestroPartido.fase != null && nuestroPartido.fase !== 'grupos'
    if (esEliminatoria) {
      const espn = await resolverConEspn(
        localMapeado,
        visitanteMapeado,
        nuestroPartido.fecha_hora,
        espnCache
      )
      if (espn) {
        finPenLocal = espn.penLocal
        finPenVisit = espn.penVisit
        finLocal = espn.regLocal + (espn.penLocal ?? 0)
        finVisit = espn.regVisit + (espn.penVisit ?? 0)
      } else if (totalLocal === totalVisitante) {
        // Sin ganador en ninguna fuente → dejar pendiente para reintentar.
        continue
      }
    }

    const updatePartido: Record<string, unknown> = {
      resultado_local: finLocal,
      resultado_visitante: finVisit,
      estado: 'finalizado',
    }
    if (finPenLocal != null) {
      updatePartido.penales_local = finPenLocal
      updatePartido.penales_visitante = finPenVisit
    }

    const { error: errUpdate } = await supabase
      .from('partidos')
      .update(updatePartido)
      .eq('id', nuestroPartido.id)

    if (errUpdate) {
      errores.push(`${localMapeado} vs ${visitanteMapeado}: ${errUpdate.message}`)
      continue
    }

    const { error: errCalculo } = await procesarResultadoPartido(
      supabase,
      nuestroPartido.id,
      finLocal,
      finVisit,
      localMapeado,
      visitanteMapeado
    )

    if (errCalculo) {
      errores.push(`Calculo ${nuestroPartido.id}: ${errCalculo}`)
      continue
    }

    // Resolver bracket (avanzar equipos a la siguiente fase)
    await resolverTrasResultado(supabase, nuestroPartido.id)
    sincronizados++
  }

  return {
    sincronizados,
    corregidos: corregidos || undefined,
    equiposActualizados: equiposActualizados || undefined,
    enVivo: enVivo || undefined,
    errores: errores.length ? errores : undefined,
  }
}
