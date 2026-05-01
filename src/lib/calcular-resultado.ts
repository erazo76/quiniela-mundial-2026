import { SupabaseClient } from '@supabase/supabase-js'

function determinarAcierto(
  predLocal: number,
  predVisit: number,
  resLocal: number,
  resVisit: number
): { tipo: string; acertado: boolean; multiplicador: number } {
  if (predLocal === resLocal && predVisit === resVisit) {
    return { tipo: 'exacto', acertado: true, multiplicador: 3 }
  }
  const ganadorPred =
    predLocal > predVisit ? 'local' : predVisit > predLocal ? 'visitante' : 'empate'
  const ganadorReal =
    resLocal > resVisit ? 'local' : resVisit > resLocal ? 'visitante' : 'empate'
  if (ganadorPred === ganadorReal) {
    return { tipo: 'ganador', acertado: true, multiplicador: 1.5 }
  }
  return { tipo: 'fallo', acertado: false, multiplicador: 0 }
}

export async function procesarResultadoPartido(
  supabase: SupabaseClient,
  partidoId: string,
  resultadoLocal: number,
  resultadoVisitante: number
): Promise<{ procesadas: number; error?: string }> {
  // Query 1: fetch predictions for this match
  const { data: predicciones, error: errPred } = await supabase
    .from('predicciones')
    .select('id, usuario_id, goles_local, goles_visitante, fichas_apostadas')
    .eq('partido_id', partidoId)

  if (errPred) return { procesadas: 0, error: errPred.message }
  if (!predicciones?.length) return { procesadas: 0 }

  // Query 2: fetch all involved users in one shot
  const usuarioIds = [...new Set(predicciones.map((p) => p.usuario_id))]
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, fichas, racha, bono_usado')
    .in('id', usuarioIds)

  const usuariosMap = new Map((usuarios ?? []).map((u) => [u.id, { ...u }]))

  const updatesPred: Array<{
    id: string
    ganancia_fichas: number
    tipo_acierto: string
    acertado: boolean
  }> = []

  const historial: Array<{
    usuario_id: string
    tipo: string
    cantidad: number
    descripcion: string
  }> = []

  // Single pass: calculate all results, update users in memory, collect historial
  for (const pred of predicciones) {
    const { tipo, acertado, multiplicador } = determinarAcierto(
      pred.goles_local,
      pred.goles_visitante,
      resultadoLocal,
      resultadoVisitante
    )

    const usuario = usuariosMap.get(pred.usuario_id)

    // Racha de oro: +0.5× a partir del 3er acierto consecutivo
    const enRacha = acertado && (usuario?.racha ?? 0) >= 2
    const ganancia = Math.floor(pred.fichas_apostadas * (enRacha ? multiplicador + 0.5 : multiplicador))

    updatesPred.push({ id: pred.id, ganancia_fichas: ganancia, tipo_acierto: tipo, acertado })

    if (usuario) {
      usuario.fichas += ganancia
      usuario.racha = acertado ? usuario.racha + 1 : 0

      // Bono de rescate: una sola vez si llega a 0
      if (usuario.fichas <= 0 && !usuario.bono_usado) {
        usuario.fichas += 300
        usuario.bono_usado = true
        historial.push({
          usuario_id: pred.usuario_id,
          tipo: 'bono_rescate',
          cantidad: 300,
          descripcion: 'Bono de rescate (fichas a 0)',
        })
      }

      if (ganancia > 0) {
        historial.push({
          usuario_id: pred.usuario_id,
          tipo,
          cantidad: ganancia,
          descripcion: `Ganancia partido ${partidoId} (${tipo})`,
        })
      }
    }
  }

  // Query 3: batch upsert predicciones (1 query regardless of N users)
  const { error: errPredUpdate } = await supabase
    .from('predicciones')
    .upsert(updatesPred)

  if (errPredUpdate) return { procesadas: 0, error: errPredUpdate.message }

  // Query 4: batch upsert usuarios (1 query regardless of N users)
  const usuarioUpdates = usuarioIds
    .map((id) => usuariosMap.get(id))
    .filter(Boolean)
    .map((u) => ({ id: u!.id, fichas: u!.fichas, racha: u!.racha, bono_usado: u!.bono_usado }))

  const { error: errUsuarios } = await supabase
    .from('usuarios')
    .upsert(usuarioUpdates)

  if (errUsuarios) return { procesadas: 0, error: errUsuarios.message }

  // Query 5: batch insert historial (already was 1 query)
  if (historial.length) {
    await supabase.from('historial_fichas').insert(historial)
  }

  return { procesadas: predicciones.length }
}
