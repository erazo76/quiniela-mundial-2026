import { SupabaseClient } from '@supabase/supabase-js'

const PENALIDAD_OMISION = 10 // fichas que pierde quien no predice un partido

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
  resultadoVisitante: number,
  equipoLocal = 'Local',
  equipoVisitante = 'Visitante'
): Promise<{ procesadas: number; error?: string }> {
  // Fetch predictions for this match
  const { data: predicciones, error: errPred } = await supabase
    .from('predicciones')
    .select('id, usuario_id, partido_id, goles_local, goles_visitante, fichas_apostadas')
    .eq('partido_id', partidoId)

  if (errPred) return { procesadas: 0, error: errPred.message }

  // Fetch ALL users — needed to apply penalty to non-predictors
  const { data: todosUsuarios, error: errUsers } = await supabase
    .from('usuarios')
    .select('id, nombre, liga_id, fichas, racha, bono_usado')

  if (errUsers) return { procesadas: 0, error: errUsers.message }
  if (!todosUsuarios?.length) return { procesadas: 0 }

  // Fetch liga tipos para diferenciar VIP vs JUNIOR
  const { data: ligas } = await supabase.from('ligas').select('id, tipo')
  const ligaTipoMap = new Map((ligas ?? []).map((l) => [l.id, l.tipo as string]))

  const predMap = new Map((predicciones ?? []).map((p) => [p.usuario_id, p]))
  const usuariosMap = new Map(todosUsuarios.map((u) => [u.id, { ...u }]))

  const updatesPred: Array<{
    id: string
    usuario_id: string
    partido_id: string
    goles_local: number
    goles_visitante: number
    fichas_apostadas: number
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

  // ── Procesar predicciones ──────────────────────────────────────────────────
  for (const pred of predicciones ?? []) {
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

    updatesPred.push({
      id: pred.id,
      usuario_id: pred.usuario_id,
      partido_id: pred.partido_id,
      goles_local: pred.goles_local,
      goles_visitante: pred.goles_visitante,
      fichas_apostadas: pred.fichas_apostadas,
      ganancia_fichas: ganancia,
      tipo_acierto: tipo,
      acertado,
    })

    if (usuario) {
      const esJunior = ligaTipoMap.get(usuario.liga_id) === 'junior'

      if (esJunior) {
        // JUNIOR: sumar puntos (3/2/0), sin racha ni bono
        const puntos = tipo === 'exacto' ? 3 : tipo === 'ganador' ? 2 : 0
        usuario.fichas += puntos
        if (puntos > 0) {
          historial.push({
            usuario_id: pred.usuario_id,
            tipo,
            cantidad: puntos,
            descripcion: `${equipoLocal} vs ${equipoVisitante} · ${resultadoLocal}-${resultadoVisitante}`,
          })
        }
      } else {
        // VIP: fichas con multiplicador, racha y bono
        usuario.fichas += ganancia
        usuario.racha = acertado ? usuario.racha + 1 : 0

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
            descripcion: `${equipoLocal} vs ${equipoVisitante} · ${resultadoLocal}-${resultadoVisitante}`,
          })
        }
      }
    }
  }

  // ── Penalidad por omisión ──────────────────────────────────────────────────
  // Usuarios que no predijeron: pierden PENALIDAD_OMISION fichas y se les rompe la racha
  for (const u of todosUsuarios) {
    if (predMap.has(u.id)) continue // predijo — ya procesado arriba

    const usuario = usuariosMap.get(u.id)!
    const esJunior = ligaTipoMap.get(usuario.liga_id) === 'junior'

    if (esJunior) {
      // JUNIOR: sin penalidad por omisión, simplemente suma 0
      continue
    }

    const penalidad = Math.min(PENALIDAD_OMISION, Math.max(0, usuario.fichas))
    usuario.fichas = Math.max(0, usuario.fichas - PENALIDAD_OMISION)
    usuario.racha = 0 // omitir un partido rompe la racha

    historial.push({
      usuario_id: u.id,
      tipo: 'penalidad_omision',
      cantidad: penalidad,
      descripcion: `${equipoLocal} vs ${equipoVisitante} · Sin predicción`,
    })

    // Bono de rescate también aplica si la penalidad lleva a 0
    if (usuario.fichas <= 0 && !usuario.bono_usado) {
      usuario.fichas += 300
      usuario.bono_usado = true
      historial.push({
        usuario_id: u.id,
        tipo: 'bono_rescate',
        cantidad: 300,
        descripcion: 'Bono de rescate (fichas a 0)',
      })
    }
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  if (updatesPred.length) {
    const { error: errPredUpdate } = await supabase.from('predicciones').upsert(updatesPred)
    if (errPredUpdate) return { procesadas: 0, error: errPredUpdate.message }
  }

  // Actualizar TODOS los usuarios (predictores + penalizados)
  const usuarioUpdates = [...usuariosMap.values()].map((u) => ({
    id: u.id,
    nombre: u.nombre,
    liga_id: u.liga_id,
    fichas: u.fichas,
    racha: u.racha,
    bono_usado: u.bono_usado,
  }))

  const { error: errUsuarios } = await supabase.from('usuarios').upsert(usuarioUpdates)
  if (errUsuarios) return { procesadas: 0, error: errUsuarios.message }

  if (historial.length) {
    await supabase.from('historial_fichas').insert(historial)
  }

  return { procesadas: (predicciones ?? []).length }
}
