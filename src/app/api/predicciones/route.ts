import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { usuario_id, partido_id, goles_local, goles_visitante, fichas_apostadas } = body

  if (!usuario_id || !partido_id || goles_local == null || goles_visitante == null || !fichas_apostadas) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  if (fichas_apostadas < 10) {
    return NextResponse.json({ error: 'La apuesta mínima es 10 fichas' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verificar partido
  const { data: partido, error: errorPartido } = await supabase
    .from('partidos')
    .select('id, estado, fecha_hora, equipo_local, equipo_visitante')
    .eq('id', partido_id)
    .single()

  if (errorPartido || !partido) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  if (partido.estado !== 'pendiente') {
    return NextResponse.json({ error: 'El partido ya no acepta predicciones' }, { status: 400 })
  }

  const kickoff = new Date(partido.fecha_hora)
  const limitePrediccion = new Date(kickoff.getTime() - 5 * 60 * 1000)
  if (new Date() >= limitePrediccion) {
    return NextResponse.json({ error: 'Las predicciones cerraron 5 minutos antes del partido' }, { status: 400 })
  }

  // Verificar fichas del usuario
  const { data: usuario, error: errorUsuario } = await supabase
    .from('usuarios')
    .select('fichas, liga_id')
    .eq('id', usuario_id)
    .single()

  if (errorUsuario || !usuario) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Determinar tipo de liga
  const { data: ligaData } = await supabase
    .from('ligas')
    .select('tipo, pote_virtual')
    .eq('id', usuario.liga_id)
    .single()
  const esJunior = ligaData?.tipo === 'junior'

  // ── Modo JUNIOR: sin fichas, solo guardamos la predicción con fichas_apostadas=1 ──
  if (esJunior) {
    const { error: errorUpsert } = await supabase
      .from('predicciones')
      .upsert(
        { usuario_id, partido_id, goles_local, goles_visitante, fichas_apostadas: 1 },
        { onConflict: 'usuario_id,partido_id' }
      )
    if (errorUpsert) return NextResponse.json({ error: errorUpsert.message }, { status: 500 })
    return NextResponse.json({ ok: true, fichas: usuario.fichas })
  }

  // ── Modo VIP: lógica de fichas completa ─────────────────────────────────────
  // Verificar si ya existe prediccion (antes de validar fichas para considerar la apuesta en curso)
  const { data: existente } = await supabase
    .from('predicciones')
    .select('id, fichas_apostadas')
    .eq('usuario_id', usuario_id)
    .eq('partido_id', partido_id)
    .maybeSingle()

  const fichasAnterior = existente?.fichas_apostadas ?? 0
  const diferencia = fichas_apostadas - fichasAnterior

  // Regla 30% solo aplica cuando se aumenta la apuesta (diferencia positiva = nueva o incremento)
  const fichasEfectivas = usuario.fichas + fichasAnterior
  if (diferencia > 0) {
    const maxApuesta = Math.floor(fichasEfectivas * 0.3)
    if (fichas_apostadas > Math.max(maxApuesta, 10)) {
      return NextResponse.json({ error: `La apuesta maxima es ${Math.max(maxApuesta, 10)} fichas (30% de tu bankroll)` }, { status: 400 })
    }
  }

  // Solo la diferencia incremental consume fichas disponibles
  if (diferencia > usuario.fichas) {
    return NextResponse.json({ error: 'No tienes fichas suficientes para esta modificación' }, { status: 400 })
  }

  // Upsert prediccion
  const { error: errorUpsert } = await supabase
    .from('predicciones')
    .upsert(
      { usuario_id, partido_id, goles_local, goles_visitante, fichas_apostadas },
      { onConflict: 'usuario_id,partido_id' }
    )

  if (errorUpsert) {
    return NextResponse.json({ error: errorUpsert.message }, { status: 500 })
  }

  // Ajustar fichas
  const nuevasFichas = usuario.fichas - diferencia
  const { error: errorFichas } = await supabase
    .from('usuarios')
    .update({ fichas: nuevasFichas })
    .eq('id', usuario_id)

  if (errorFichas) {
    return NextResponse.json({ error: errorFichas.message }, { status: 500 })
  }

  // Log en historial
  if (diferencia !== 0) {
    const tipo = diferencia > 0 ? 'apuesta' : 'devolucion'
    const cantidad = Math.abs(diferencia)
    const accion = existente ? 'modificada' : 'nueva'
    await supabase.from('historial_fichas').insert({
      usuario_id,
      tipo,
      cantidad: diferencia > 0 ? -cantidad : cantidad,
      descripcion: `${partido.equipo_local} vs ${partido.equipo_visitante} · pred. ${goles_local}-${goles_visitante}${accion === 'modificada' ? ' (modificada)' : ''}`,
    })

    // Acumular 5% de la apuesta neta al pote de la liga
    const COMISION = 0.05
    const poteDelta = Math.round(diferencia * COMISION)
    if (poteDelta !== 0) {
      const nuevoPote = Math.max(0, (ligaData?.pote_virtual ?? 0) + poteDelta)
      await supabase.from('ligas').update({ pote_virtual: nuevoPote }).eq('id', usuario.liga_id)
    }
  }

  return NextResponse.json({ ok: true, fichas: nuevasFichas })
}
