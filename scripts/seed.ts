import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface Equipo {
  nombre_pais: string
  codigo_pais: string
  mejor_puesto_mundial: string
  participaciones: number
  figura_clave_nombre: string
  dato_freak_1: string
  dato_freak_2: string
  dato_freak_3: string
}

interface Partido {
  fase: string
  grupo: string | null
  equipo_local: string
  equipo_visitante: string
  fecha_hora: string
  sede: string
}

const equipos: Equipo[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/equipos.json'), 'utf-8')
)
const partidos: Partido[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/partidos.json'), 'utf-8')
)

const codigoPorNombre: Record<string, string> = {}
for (const e of equipos) {
  codigoPorNombre[e.nombre_pais] = e.codigo_pais
}

async function limpiarTablas() {
  console.log('Limpiando predicciones...')
  const { error: e1 } = await supabase.from('predicciones').delete().not('id', 'is', null)
  if (e1) throw e1

  console.log('Limpiando partidos...')
  const { error: e2 } = await supabase.from('partidos').delete().not('id', 'is', null)
  if (e2) throw e2

  console.log('Limpiando info_equipos...')
  const { error: e3 } = await supabase.from('info_equipos').delete().not('id', 'is', null)
  if (e3) throw e3
}

async function insertarEquipos() {
  console.log('Insertando equipos...')
  const rows = equipos.map((e) => ({
    nombre_pais: e.nombre_pais,
    codigo_pais: e.codigo_pais,
    bandera_url: `/flags/${e.codigo_pais}.png`,
    mejor_puesto_mundial: e.mejor_puesto_mundial,
    participaciones: e.participaciones,
    figura_clave_nombre: e.figura_clave_nombre,
    dato_freak_1: e.dato_freak_1,
    dato_freak_2: e.dato_freak_2,
    dato_freak_3: e.dato_freak_3,
  }))

  const { error } = await supabase.from('info_equipos').insert(rows)
  if (error) throw error
  console.log(`  ✓ ${rows.length} equipos`)
}

async function insertarPartidos() {
  console.log('Insertando partidos...')
  const rows = partidos.map((p) => {
    const codLocal = codigoPorNombre[p.equipo_local]
    const codVisit = codigoPorNombre[p.equipo_visitante]
    return {
      equipo_local: p.equipo_local,
      equipo_visitante: p.equipo_visitante,
      bandera_local: codLocal ? `/flags/${codLocal}.png` : null,
      bandera_visitante: codVisit ? `/flags/${codVisit}.png` : null,
      fase: p.fase,
      grupo: p.grupo,
      fecha_hora: p.fecha_hora,
      sede: p.sede,
      estado: 'pendiente',
    }
  })

  const { error } = await supabase.from('partidos').insert(rows)
  if (error) throw error
  console.log(`  ✓ ${rows.length} partidos`)
}

async function seed() {
  try {
    await limpiarTablas()
    await insertarEquipos()
    await insertarPartidos()
    console.log('\nSeed completado.')
  } catch (err) {
    console.error('Error durante el seed:', err)
    process.exit(1)
  }
}

seed()
