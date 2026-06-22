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

// Mapeo de etapas de la API → fases en nuestra DB
const FASE_MAP: Record<string, string> = {
  LAST_32: 'dieciseisavos',
  LAST_16: 'octavos',
  QUARTER_FINALS: 'cuartos',
  SEMI_FINALS: 'semis',
  THIRD_PLACE: 'tercer_puesto',
  FINAL: 'final',
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

// Palabras que indican equipo TBD en la API
const TBD_WORDS = ['yet', 'winner', 'loser', 'tbd', 'tba']
function esTBD(nombre: string | null | undefined): boolean {
  if (!nombre) return true
  const lower = nombre.toLowerCase()
  return TBD_WORDS.some((w) => lower.includes(w))
}

async function syncEquiposEliminatorias(
  supabase: SupabaseClient,
  apiKey: string
): Promise<number> {
  // Obtener banderas desde la DB para mapear nombre → URL
  const { data: infoEquipos } = await supabase
    .from('info_equipos')
    .select('nombre_pais, bandera_url')

  const banderaMap = new Map(
    (infoEquipos ?? []).map((e: { nombre_pais: string; bandera_url: string }) => [
      e.nombre_pais,
      e.bandera_url,
    ])
  )

  // Obtener partidos SCHEDULED/TIMED de eliminatorias desde la API
  const res = await fetchFootballData(
    'https://api.football-data.org/v4/competitions/WC/matches?status=SCHEDULED,TIMED',
    apiKey
  )
  if (!res || !res.ok) return 0

  const data = await res.json()
  const partidosApi: Array<{
    homeTeam: { name: string }
    awayTeam: { name: string }
    utcDate: string
    stage: string
  }> = (data.matches ?? []).filter(
    (m: { stage: string }) => m.stage !== 'GROUP_STAGE' && FASE_MAP[m.stage]
  )

  if (!partidosApi.length) return 0

  // Obtener nuestros partidos pendientes de fases eliminatorias
  const fasesElim = Object.values(FASE_MAP)
  const { data: nuestrosPartidos } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, fase, fecha_hora')
    .in('fase', fasesElim)
    .in('estado', ['pendiente', 'en_vivo'])

  if (!nuestrosPartidos?.length) return 0

  let actualizados = 0

  for (const partido of partidosApi) {
    const localApi = partido.homeTeam.name
    const visitanteApi = partido.awayTeam.name

    // Saltar si alguno es TBD
    if (esTBD(localApi) || esTBD(visitanteApi)) continue

    const localEs = TEAM_MAP[localApi] ?? localApi
    const visitanteEs = TEAM_MAP[visitanteApi] ?? visitanteApi
    const fase = FASE_MAP[partido.stage]
    const fechaApi = partido.utcDate.split('T')[0]

    // Buscar nuestro partido por fecha y fase
    const nuestro = nuestrosPartidos.find((p) => {
      const fechaDB = p.fecha_hora.split('T')[0]
      return fechaDB === fechaApi && p.fase === fase
    })

    if (!nuestro) continue

    // Solo actualizar si los equipos cambiaron
    if (nuestro.equipo_local === localEs && nuestro.equipo_visitante === visitanteEs) continue

    const { error } = await supabase
      .from('partidos')
      .update({
        equipo_local: localEs,
        equipo_visitante: visitanteEs,
        bandera_local: banderaMap.get(localEs) ?? null,
        bandera_visitante: banderaMap.get(visitanteEs) ?? null,
      })
      .eq('id', nuestro.id)

    if (!error) actualizados++
  }

  return actualizados
}

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

  // Actualizar equipos en rondas eliminatorias. Su fallo NO debe abortar la
  // sincronización de resultados: lo aislamos en su propio try/catch.
  let equiposActualizados = 0
  try {
    equiposActualizados = await syncEquiposEliminatorias(supabase, apiKey)
  } catch {
    equiposActualizados = 0
  }

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
    .select('id, equipo_local, equipo_visitante, estado, resultado_local, resultado_visitante')
    .in('estado', ['pendiente', 'en_vivo'])

  if (errDB) throw new Error(errDB.message)

  const { data: finalizadosRecientes } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, estado, resultado_local, resultado_visitante')
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
    const updatePartido: Record<string, unknown> = {
      resultado_local: totalLocal,
      resultado_visitante: totalVisitante,
      estado: 'finalizado',
    }
    if (penLocal != null) {
      updatePartido.penales_local = penLocal
      updatePartido.penales_visitante = penVisitante
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
      totalLocal,
      totalVisitante,
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
