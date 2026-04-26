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
  const { data: predicciones, error: errPred } = await supabase
    .from('predicciones')
    .select('id, usuario_id, goles_local, goles_visitante, fichas_apostadas')
    .eq('partido_id', partidoId)

  if (errPred) return { procesadas: 0, error: errPred.message }
  if (!predicciones?.length) return { procesadas: 0 }

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

  for (const pred of predicciones) {
    const { tipo, acertado, multiplicador } = determinarAcierto(
      pred.goles_local,
      pred.goles_visitante,
      resultadoLocal,
      resultadoVisitante
    )
    const ganancia = Math.floor(pred.fichas_apostadas * multiplicador)
    updatesPred.push({ id: pred.id, ganancia_fichas: ganancia, tipo_acierto: tipo, acertado })

    const usuario = usuariosMap.get(pred.usuario_id)
    if (usuario) {
      usuario.fichas += ganancia
      usuario.racha = acertado ? usuario.racha + 1 : 0
    }
  }

  await Promise.all(
    updatesPred.map(({ id, ganancia_fichas, tipo_acierto, acertado }) =>
      supabase.from('predicciones').update({ ganancia_fichas, tipo_acierto, acertado }).eq('id', id)
    )
  )

  const historial: Array<{
    usuario_id: string
    tipo: string
    cantidad: number
    descripcion: string
  }> = []

  for (const pred of predicciones) {
    const usuario = usuariosMap.get(pred.usuario_id)
    const update = updatesPred.find((u) => u.id === pred.id)
    if (!usuario || !update) continue

    let fichasFinales = usuario.fichas
    if (fichasFinales <= 0 && !usuario.bono_usado) {
      fichasFinales += 300
      usuario.bono_usado = true
      historial.push({
        usuario_id: pred.usuario_id,
        tipo: 'bono_rescate',
        cantidad: 300,
        descripcion: 'Bono de rescate (fichas a 0)',
      })
    }

    await supabase
      .from('usuarios')
      .update({ fichas: fichasFinales, racha: usuario.racha, bono_usado: usuario.bono_usado })
      .eq('id', pred.usuario_id)

    if (update.ganancia_fichas > 0) {
      historial.push({
        usuario_id: pred.usuario_id,
        tipo: update.tipo_acierto,
        cantidad: update.ganancia_fichas,
        descripcion: `Ganancia partido ${partidoId} (${update.tipo_acierto})`,
      })
    }
  }

  if (historial.length) {
    await supabase.from('historial_fichas').insert(historial)
  }

  return { procesadas: predicciones.length }
}
