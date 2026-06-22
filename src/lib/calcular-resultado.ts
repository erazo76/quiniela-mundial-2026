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

  // Fecha del partido: define la fecha límite de predicción (kickoff − 5 min).
  // Sirve para no penalizar a jugadores que se unieron cuando el partido ya
  // estaba cerrado (nunca tuvieron oportunidad de predecir).
  const { data: partidoMeta } = await supabase
    .from('partidos')
    .select('fecha_hora')
    .eq('id', partidoId)
    .maybeSingle()
  const limitePrediccion = partidoMeta?.fecha_hora
    ? new Date(new Date(partidoMeta.fecha_hora).getTime() - 5 * 60 * 1000)
    : null

  // Fetch ALL users — needed to apply penalty to non-predictors
  const { data: todosUsuarios, error: errUsers } = await supabase
    .from('usuarios')
    .select('id, nombre, liga_id, fichas, racha, bono_usado, created_at')

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
    const esJunior = usuario ? ligaTipoMap.get(usuario.liga_id) === 'junior' : false

    // Racha de oro: +0.5× a partir del 3er acierto consecutivo (solo MASTER)
    const enRacha = !esJunior && acertado && (usuario?.racha ?? 0) >= 2
    const gananciaVip = Math.floor(pred.fichas_apostadas * (enRacha ? multiplicador + 0.5 : multiplicador))
    // JUNIOR: puntos fijos (3/2/0); MASTER: fichas × multiplicador
    const gananciaFichas = esJunior
      ? (tipo === 'exacto' ? 3 : tipo === 'ganador' ? 2 : 0)
      : gananciaVip

    updatesPred.push({
      id: pred.id,
      usuario_id: pred.usuario_id,
      partido_id: pred.partido_id,
      goles_local: pred.goles_local,
      goles_visitante: pred.goles_visitante,
      fichas_apostadas: pred.fichas_apostadas,
      ganancia_fichas: gananciaFichas,
      tipo_acierto: tipo,
      acertado,
    })

    if (usuario) {
      if (esJunior) {
        // JUNIOR: sumar puntos (3/2/0), sin racha ni bono
        usuario.fichas += gananciaFichas
        if (gananciaFichas > 0) {
          historial.push({
            usuario_id: pred.usuario_id,
            tipo,
            cantidad: gananciaFichas,
            descripcion: `${equipoLocal} vs ${equipoVisitante} · ${resultadoLocal}-${resultadoVisitante}`,
          })
        }
      } else {
        // MASTER: fichas con multiplicador, racha y bono
        usuario.fichas += gananciaVip
        usuario.racha = acertado ? usuario.racha + 1 : 0

        if (usuario.fichas <= 0 && !usuario.bono_usado) {
          usuario.fichas += 100
          usuario.bono_usado = true
          historial.push({
            usuario_id: pred.usuario_id,
            tipo: 'bono_rescate',
            cantidad: 100,
            descripcion: 'Bono de rescate (fichas a 0)',
          })
        }

        if (gananciaVip > 0) {
          historial.push({
            usuario_id: pred.usuario_id,
            tipo,
            cantidad: gananciaVip,
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

    // Inscripción tardía: si el jugador se unió después de que cerraran las
    // predicciones de este partido, nunca pudo predecirlo → queda en 0, sin penalidad.
    if (limitePrediccion && usuario.created_at && new Date(usuario.created_at) >= limitePrediccion) {
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
      usuario.fichas += 100
      usuario.bono_usado = true
      historial.push({
        usuario_id: u.id,
        tipo: 'bono_rescate',
        cantidad: 100,
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

// ─────────────────────────────────────────────────────────────────────────────
// REPROCESO IDEMPOTENTE
// ─────────────────────────────────────────────────────────────────────────────
//
// Recalcula un partido YA finalizado cuando su marcador cambia (p. ej. la API
// corrigió un marcador provisional/erróneo). A diferencia de procesarResultado-
// Partido, NO suma desde cero: ajusta las fichas de cada predictor por el DELTA
// entre la ganancia anterior (guardada en predicciones.ganancia_fichas) y la
// nueva. Por eso es idempotente: correrlo de nuevo con el mismo marcador no
// cambia nada.
//
// Lo que NO se toca aquí (porque NO depende del marcador):
//   - Penalidad por omisión: el conjunto de quienes no predijeron y el castigo
//     fijo (−10) son invariantes ante un cambio de marcador.
//   - Reset de racha por omisión: idem.
// Solo se reprocesan las predicciones EXISTENTES del partido.
//
// Limitación conocida (solo MASTER): si una corrección cambia `acertado` de una
// predicción master que tiene partidos posteriores ya scoreados, el bonus de
// "racha de oro" (+0.5×) de esos partidos futuros no se recalcula. La racha en
// sí se recomputa correctamente; el caso es extremadamente raro.
export async function reprocesarResultadoPartido(
  supabase: SupabaseClient,
  partidoId: string,
  resultadoLocal: number,
  resultadoVisitante: number,
  equipoLocal = 'Local',
  equipoVisitante = 'Visitante'
): Promise<{ procesadas: number; corregidas: number; error?: string }> {
  const { data: predicciones, error: errPred } = await supabase
    .from('predicciones')
    .select(
      'id, usuario_id, partido_id, goles_local, goles_visitante, fichas_apostadas, ganancia_fichas, tipo_acierto, acertado'
    )
    .eq('partido_id', partidoId)

  if (errPred) return { procesadas: 0, corregidas: 0, error: errPred.message }
  if (!predicciones?.length) return { procesadas: 0, corregidas: 0 }

  const userIds = [...new Set(predicciones.map((p) => p.usuario_id))]

  const { data: usuarios, error: errU } = await supabase
    .from('usuarios')
    .select('id, fichas, racha, liga_id, created_at')
    .in('id', userIds)
  if (errU) return { procesadas: 0, corregidas: 0, error: errU.message }

  const { data: ligas } = await supabase.from('ligas').select('id, tipo')
  const ligaTipoMap = new Map((ligas ?? []).map((l) => [l.id, l.tipo as string]))
  const userMap = new Map((usuarios ?? []).map((u) => [u.id, { ...u }]))

  // Nuevo acierto/tipo por predicción — depende solo del marcador.
  const calc = new Map(
    predicciones.map((p) => [
      p.id,
      determinarAcierto(p.goles_local, p.goles_visitante, resultadoLocal, resultadoVisitante),
    ])
  )

  // Predictores MASTER: solo para ellos hace falta reconstruir la racha
  // (los junior no tienen racha ni multiplicador).
  const masterUserIds = userIds.filter((id) => {
    const u = userMap.get(id)
    return u && ligaTipoMap.get(u.liga_id) !== 'junior'
  })

  let rachaBeforeMap = new Map<string, number>()
  let rachaFinalMap = new Map<string, number>()
  if (masterUserIds.length) {
    const overrideAcertado = new Map(
      predicciones
        .filter((p) => masterUserIds.includes(p.usuario_id))
        .map((p) => [p.usuario_id, calc.get(p.id)!.acertado])
    )
    ;({ rachaBeforeMap, rachaFinalMap } = await replayRachaMaster(
      supabase,
      masterUserIds,
      partidoId,
      overrideAcertado
    ))
  }

  const updatesPred: Array<Record<string, unknown>> = []
  const historial: Array<{
    usuario_id: string
    tipo: string
    cantidad: number
    descripcion: string
  }> = []

  for (const pred of predicciones) {
    const { tipo, acertado, multiplicador } = calc.get(pred.id)!
    const u = userMap.get(pred.usuario_id)
    const esJunior = u ? ligaTipoMap.get(u.liga_id) === 'junior' : false

    let nuevaGanancia: number
    if (esJunior) {
      nuevaGanancia = tipo === 'exacto' ? 3 : tipo === 'ganador' ? 2 : 0
    } else {
      const rachaBefore = rachaBeforeMap.get(pred.usuario_id) ?? 0
      const enRacha = acertado && rachaBefore >= 2
      nuevaGanancia = Math.floor(
        pred.fichas_apostadas * (enRacha ? multiplicador + 0.5 : multiplicador)
      )
    }

    const delta = nuevaGanancia - (pred.ganancia_fichas ?? 0)

    if (delta !== 0 || tipo !== pred.tipo_acierto || acertado !== pred.acertado) {
      updatesPred.push({
        id: pred.id,
        usuario_id: pred.usuario_id,
        partido_id: pred.partido_id,
        goles_local: pred.goles_local,
        goles_visitante: pred.goles_visitante,
        fichas_apostadas: pred.fichas_apostadas,
        ganancia_fichas: nuevaGanancia,
        tipo_acierto: tipo,
        acertado,
      })
    }

    if (u && delta !== 0) {
      u.fichas += delta
      historial.push({
        usuario_id: u.id,
        tipo: 'correccion',
        cantidad: delta,
        descripcion: `Corrección ${equipoLocal} vs ${equipoVisitante} · ${resultadoLocal}-${resultadoVisitante} (${delta > 0 ? '+' : ''}${delta})`,
      })
    }
  }

  // Racha final recomputada (solo masters)
  for (const id of masterUserIds) {
    const u = userMap.get(id)
    const nr = rachaFinalMap.get(id)
    if (u && nr != null) u.racha = nr
  }

  if (updatesPred.length) {
    const { error } = await supabase.from('predicciones').upsert(updatesPred)
    if (error) return { procesadas: 0, corregidas: 0, error: error.message }
  }

  // Actualizar solo fichas/racha de los usuarios involucrados (set acotado).
  const userUpdates = [...userMap.values()].map((u) => ({
    id: u.id,
    fichas: u.fichas,
    racha: u.racha,
  }))
  if (userUpdates.length) {
    const { error } = await supabase.from('usuarios').upsert(userUpdates)
    if (error) return { procesadas: 0, corregidas: 0, error: error.message }
  }

  if (historial.length) {
    await supabase.from('historial_fichas').insert(historial)
  }

  return { procesadas: predicciones.length, corregidas: updatesPred.length }
}

// Reconstruye la racha de jugadores MASTER replayando todos los partidos
// finalizados en orden cronológico. Devuelve, por usuario, la racha JUSTO ANTES
// del partido objetivo (para decidir el bonus de racha de oro al recalcularlo) y
// la racha FINAL (tras aplicar el nuevo `acertado` del partido objetivo).
async function replayRachaMaster(
  supabase: SupabaseClient,
  masterUserIds: string[],
  targetPartidoId: string,
  overrideAcertado: Map<string, boolean>
): Promise<{ rachaBeforeMap: Map<string, number>; rachaFinalMap: Map<string, number> }> {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora')
    .eq('estado', 'finalizado')
    .order('fecha_hora', { ascending: true })

  const { data: preds } = await supabase
    .from('predicciones')
    .select('usuario_id, partido_id, acertado')
    .in('usuario_id', masterUserIds)

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, created_at')
    .in('id', masterUserIds)

  const createdMap = new Map((usuarios ?? []).map((u) => [u.id, u.created_at]))
  const predByUserMatch = new Map(
    (preds ?? []).map((p) => [`${p.usuario_id}:${p.partido_id}`, p.acertado as boolean])
  )

  const rachaBeforeMap = new Map<string, number>()
  const rachaFinalMap = new Map<string, number>()

  for (const uid of masterUserIds) {
    let racha = 0
    const created = createdMap.get(uid)

    for (const m of matches ?? []) {
      if (m.id === targetPartidoId) rachaBeforeMap.set(uid, racha)

      const key = `${uid}:${m.id}`
      let acert: boolean | undefined
      if (m.id === targetPartidoId && overrideAcertado.has(uid)) {
        acert = overrideAcertado.get(uid)
      } else if (predByUserMatch.has(key)) {
        acert = predByUserMatch.get(key)
      }

      if (acert === undefined) {
        // Omisión: rompe la racha, salvo inscripción tardía (no pudo predecir).
        const limite = new Date(new Date(m.fecha_hora).getTime() - 5 * 60 * 1000)
        if (created && new Date(created) >= limite) continue
        racha = 0
      } else {
        racha = acert ? racha + 1 : 0
      }
    }

    rachaFinalMap.set(uid, racha)
    if (!rachaBeforeMap.has(uid)) rachaBeforeMap.set(uid, racha)
  }

  return { rachaBeforeMap, rachaFinalMap }
}
