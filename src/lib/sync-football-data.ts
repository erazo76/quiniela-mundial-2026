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

export async function syncResultadosFootballData(
  supabase: SupabaseClient
): Promise<{ sincronizados: number; mensaje?: string; errores?: string[] }> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return { sincronizados: 0, mensaje: 'FOOTBALL_DATA_API_KEY no configurado' }

  const fdRes = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED',
    { headers: { 'X-Auth-Token': apiKey }, cache: 'no-store' }
  )

  if (!fdRes.ok) {
    const text = await fdRes.text()
    throw new Error(`football-data.org ${fdRes.status}: ${text}`)
  }

  const fdData = await fdRes.json()
  const partidosApi: Array<{
    homeTeam: { name: string }
    awayTeam: { name: string }
    score: { fullTime: { home: number | null; away: number | null } }
  }> = fdData.matches ?? []

  if (!partidosApi.length) return { sincronizados: 0, mensaje: 'Sin partidos finalizados en la API' }

  const { data: nuestrosPartidos, error: errDB } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, estado')
    .in('estado', ['pendiente', 'en_vivo'])

  if (errDB) throw new Error(errDB.message)
  if (!nuestrosPartidos?.length) return { sincronizados: 0, mensaje: 'No hay partidos pendientes' }

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

  return { sincronizados, errores: errores.length ? errores : undefined }
}
