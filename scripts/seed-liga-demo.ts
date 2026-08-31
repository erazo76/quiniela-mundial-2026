/**
 * Crea (o regenera) la liga DEMO pública que sirve de vitrina en el portafolio.
 *
 * El torneo terminó, pero la landing pide un código de invitación, así que sin
 * una liga abierta un visitante no ve nada. Este script clona una liga real
 * —predicciones, fichas, rachas e historial— sustituyendo los nombres de los
 * participantes por "Jugador 01", "Jugador 02"… y poniendo el mismo PIN público
 * a todos, de modo que cualquiera pueda entrar y navegar la app con datos
 * verosímiles sin exponer a nadie.
 *
 * Es idempotente: si la liga demo ya existe, borra su contenido y lo vuelve a
 * generar. Nunca toca la liga de origen.
 *
 * Ejecutar:
 *   npm run seed:demo
 */
import { createAdminClient } from '../src/lib/supabase/admin'
import { hashPin } from '../src/lib/pin'

const CODIGO_DEMO = 'DEMO26'
const NOMBRE_DEMO = 'Liga Demo'
const PIN_DEMO = '0000'
// Liga real que se clona. Se elige la de más participantes para que el ranking
// y las tablas se vean poblados.
const CODIGO_ORIGEN = 'CL4ISI'

const LOTE = 500
// PostgREST corta cualquier select en 1000 filas sin avisar, así que las
// lecturas grandes (predicciones, historial) van paginadas con .range().
const PAGINA = 1000

type Supabase = ReturnType<typeof createAdminClient>

async function leerTodo<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  etiqueta: string
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1)
    if (error) throw new Error(`Leyendo ${etiqueta}: ${error.message}`)
    if (!data?.length) break
    filas.push(...data)
    if (data.length < PAGINA) break
  }
  return filas
}

async function insertarEnLotes<T>(supabase: Supabase, tabla: string, filas: T[]) {
  for (let i = 0; i < filas.length; i += LOTE) {
    const { error } = await supabase.from(tabla).insert(filas.slice(i, i + LOTE))
    if (error) throw new Error(`Insertando en ${tabla}: ${error.message}`)
  }
}

async function main() {
  const supabase = createAdminClient()

  const { data: origen } = await supabase
    .from('ligas')
    .select('id, nombre_liga, tipo, pote_virtual')
    .eq('codigo_invitacion', CODIGO_ORIGEN)
    .maybeSingle()

  if (!origen) throw new Error(`No existe la liga de origen ${CODIGO_ORIGEN}`)

  // ── 1. Liga demo: reutilizar la existente o crearla ──
  const { data: existente } = await supabase
    .from('ligas')
    .select('id')
    .eq('codigo_invitacion', CODIGO_DEMO)
    .maybeSingle()

  let ligaDemoId: string

  if (existente) {
    ligaDemoId = existente.id
    const { data: viejos } = await supabase.from('usuarios').select('id').eq('liga_id', ligaDemoId)
    const ids = (viejos ?? []).map((u) => u.id)
    if (ids.length) {
      await supabase.from('predicciones').delete().in('usuario_id', ids)
      await supabase.from('historial_fichas').delete().in('usuario_id', ids)
      await supabase.from('usuarios').delete().in('id', ids)
    }
    await supabase.from('ligas').update({ pote_virtual: origen.pote_virtual ?? 0 }).eq('id', ligaDemoId)
    console.log(`Liga demo existente reiniciada (${ids.length} jugadores borrados)`)
  } else {
    const { data: creada, error } = await supabase
      .from('ligas')
      .insert({
        codigo_invitacion: CODIGO_DEMO,
        nombre_liga: NOMBRE_DEMO,
        tipo: origen.tipo ?? 'junior',
        pote_virtual: origen.pote_virtual ?? 0,
      })
      .select('id')
      .single()
    if (error || !creada) throw new Error(`Creando la liga demo: ${error?.message}`)
    ligaDemoId = creada.id
    console.log('Liga demo creada')
  }

  // ── 2. Jugadores anonimizados ──
  const { data: usuariosOrigen } = await supabase
    .from('usuarios')
    .select('id, fichas, racha, bono_usado')
    .eq('liga_id', origen.id)
    .order('fichas', { ascending: false })

  if (!usuariosOrigen?.length) throw new Error('La liga de origen no tiene jugadores')

  const pinHash = await hashPin(PIN_DEMO)
  const nuevos = usuariosOrigen.map((u, i) => ({
    nombre: `Jugador ${String(i + 1).padStart(2, '0')}`,
    liga_id: ligaDemoId,
    fichas: u.fichas,
    racha: u.racha,
    bono_usado: u.bono_usado,
    pin: pinHash,
  }))

  const { data: creados, error: errUsuarios } = await supabase
    .from('usuarios')
    .insert(nuevos)
    .select('id, nombre')
  if (errUsuarios || !creados) throw new Error(`Creando jugadores: ${errUsuarios?.message}`)

  // El insert devuelve las filas en el orden enviado, pero no conviene darlo por
  // hecho: se mapea por nombre, que es único dentro de la liga.
  const porNombre = new Map(creados.map((u) => [u.nombre, u.id]))
  const mapa = new Map<string, string>()
  usuariosOrigen.forEach((u, i) => {
    const nombre = `Jugador ${String(i + 1).padStart(2, '0')}`
    mapa.set(u.id, porNombre.get(nombre)!)
  })
  console.log(`${creados.length} jugadores anonimizados`)

  // ── 3. Predicciones ──
  const idsOrigen = usuariosOrigen.map((u) => u.id)
  const predicciones = await leerTodo<{ usuario_id: string }>(
    (desde, hasta) =>
      supabase
        .from('predicciones')
        .select('usuario_id, partido_id, goles_local, goles_visitante, fichas_apostadas, ganancia_fichas, tipo_acierto, acertado, created_at')
        .in('usuario_id', idsOrigen)
        .order('created_at', { ascending: true })
        .range(desde, hasta),
    'predicciones'
  )

  await insertarEnLotes(
    supabase,
    'predicciones',
    predicciones.map((p) => ({ ...p, usuario_id: mapa.get(p.usuario_id)! }))
  )
  console.log(`${predicciones.length} predicciones clonadas`)

  // ── 4. Historial de fichas ──
  const historial = await leerTodo<{ usuario_id: string }>(
    (desde, hasta) =>
      supabase
        .from('historial_fichas')
        .select('usuario_id, tipo, cantidad, descripcion, created_at')
        .in('usuario_id', idsOrigen)
        .order('created_at', { ascending: true })
        .range(desde, hasta),
    'historial_fichas'
  )

  await insertarEnLotes(
    supabase,
    'historial_fichas',
    historial.map((h) => ({ ...h, usuario_id: mapa.get(h.usuario_id)! }))
  )
  console.log(`${historial.length} movimientos de historial clonados`)

  console.log(`\nListo. Código ${CODIGO_DEMO} · PIN ${PIN_DEMO} para todos los jugadores.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
