/**
 * Reproceso idempotente de TODOS los partidos de grupos finalizados.
 *
 * Usa reprocesarResultadoPartido (delta-based) para recalcular tipo_acierto y
 * ganancia con la lógica corregida de empate en grupos:
 *   - pronóstico de empate con marcador distinto (1-1 vs 2-2) -> "ganador" (2 pts)
 *   - pronóstico NO empate sobre un partido empatado          -> "fallo"   (0 pts)
 *
 * Es seguro correrlo varias veces: las predicciones ya correctas dan delta 0.
 *
 * Ejecutar:
 *   npm run reprocesar:grupos
 */
import { createAdminClient } from '../src/lib/supabase/admin'
import { reprocesarResultadoPartido } from '../src/lib/calcular-resultado'

async function main() {
  const supabase = createAdminClient()

  const { data: partidos, error } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, resultado_local, resultado_visitante, fase, estado')
    .eq('fase', 'grupos')
    .eq('estado', 'finalizado')
    .order('fecha_hora', { ascending: true })

  if (error) throw new Error(error.message)
  if (!partidos?.length) {
    console.log('No hay partidos de grupos finalizados.')
    return
  }

  let totalCorregidas = 0
  for (const p of partidos) {
    if (p.resultado_local == null || p.resultado_visitante == null) continue
    const { procesadas, corregidas, error: err } = await reprocesarResultadoPartido(
      supabase,
      p.id,
      p.resultado_local,
      p.resultado_visitante,
      p.equipo_local ?? 'Local',
      p.equipo_visitante ?? 'Visitante'
    )
    if (err) {
      console.error(`ERROR ${p.equipo_local} vs ${p.equipo_visitante}: ${err}`)
      continue
    }
    if (corregidas > 0) {
      console.log(
        `CORREGIDO  ${p.equipo_local} ${p.resultado_local}-${p.resultado_visitante} ${p.equipo_visitante}  ` +
          `(${corregidas}/${procesadas} predicciones)`
      )
    }
    totalCorregidas += corregidas
  }

  console.log(`\nListo. Predicciones corregidas: ${totalCorregidas} sobre ${partidos.length} partidos.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
