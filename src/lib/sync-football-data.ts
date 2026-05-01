import { SupabaseClient } from '@supabase/supabase-js'
import { procesarResultadoPartido } from './calcular-resultado'

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
  Australia: 'Australia',
  'Saudi Arabia': 'Arabia Saudita',
  Iran: 'Irán',
  Egypt: 'Egipto',
  Ghana: 'Ghana',
  "Côte d'Ivoire": 'Costa de Marfil',
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
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  Haiti: 'Haití',
  'Curaçao': 'Curazao',
  Iraq: 'Irak',
  Jordan: 'Jordania',
  Uzbekistan: 'Uzbekistán',
  'Cape Verde': 'Cabo Verde',
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
  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?status=SCHEDULED,TIMED',
    { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }
  )
  if (!res.ok) return 0

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

export async function syncResultadosFootballData(
  supabase: SupabaseClient
): Promise<{ sincronizados: number; equiposActualizados?: number; mensaje?: string; errores?: string[] }> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return { sincronizados: 0, mensaje: 'FOOTBALL_DATA_API_KEY no configurado' }

  // Actualizar equipos en rondas eliminatorias (en paralelo con la sync de resultados)
  const equiposActualizados = await syncEquiposEliminatorias(supabase, apiKey)

  const fdRes = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED',
    { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }
  )

  if (!fdRes.ok) {
    return {
      sincronizados: 0,
      equiposActualizados: equiposActualizados || undefined,
      mensaje: `API no disponible (HTTP ${fdRes.status}). El Mundial 2026 aún no ha comenzado o verifica la clave API.`,
    }
  }

  const fdData = await fdRes.json()
  const partidosApi: Array<{
    homeTeam: { name: string }
    awayTeam: { name: string }
    score: { fullTime: { home: number | null; away: number | null } }
  }> = fdData.matches ?? []

  if (!partidosApi.length) {
    return {
      sincronizados: 0,
      equiposActualizados: equiposActualizados || undefined,
      mensaje: 'Sin partidos finalizados en la API',
    }
  }

  const { data: nuestrosPartidos, error: errDB } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, estado')
    .in('estado', ['pendiente', 'en_vivo'])

  if (errDB) throw new Error(errDB.message)
  if (!nuestrosPartidos?.length) {
    return {
      sincronizados: 0,
      equiposActualizados: equiposActualizados || undefined,
      mensaje: 'No hay partidos pendientes',
    }
  }

  let sincronizados = 0
  const errores: string[] = []

  for (const partido of partidosApi) {
    const localMapeado = TEAM_MAP[partido.homeTeam.name] ?? partido.homeTeam.name
    const visitanteMapeado = TEAM_MAP[partido.awayTeam.name] ?? partido.awayTeam.name
    const resLocal = partido.score.fullTime.home
    const resVisit = partido.score.fullTime.away

    if (resLocal == null || resVisit == null) continue

    const nuestroPartido = nuestrosPartidos.find(
      (p) => p.equipo_local === localMapeado && p.equipo_visitante === visitanteMapeado
    )
    if (!nuestroPartido) continue

    const { error: errUpdate } = await supabase
      .from('partidos')
      .update({ resultado_local: resLocal, resultado_visitante: resVisit, estado: 'finalizado' })
      .eq('id', nuestroPartido.id)

    if (errUpdate) {
      errores.push(`${localMapeado} vs ${visitanteMapeado}: ${errUpdate.message}`)
      continue
    }

    const { error: errCalculo } = await procesarResultadoPartido(
      supabase,
      nuestroPartido.id,
      resLocal,
      resVisit
    )

    if (errCalculo) {
      errores.push(`Calculo ${nuestroPartido.id}: ${errCalculo}`)
    } else {
      sincronizados++
    }
  }

  return {
    sincronizados,
    equiposActualizados: equiposActualizados || undefined,
    errores: errores.length ? errores : undefined,
  }
}
