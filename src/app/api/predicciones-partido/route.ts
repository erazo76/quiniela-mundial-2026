import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const partidoId = req.nextUrl.searchParams.get('partido_id')
  const ligaId    = req.nextUrl.searchParams.get('liga_id')
  const usuarioId = req.nextUrl.searchParams.get('usuario_id')
  if (!partidoId || !ligaId) {
    return NextResponse.json({ error: 'partido_id y liga_id requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Estado del partido para saber si la ventana de predicción sigue abierta.
  // Lookup por PK: barato, no afecta el rendimiento.
  const { data: partido, error: errPartido } = await supabase
    .from('partidos')
    .select('estado, fecha_hora')
    .eq('id', partidoId)
    .single()

  if (errPartido) return NextResponse.json({ error: errPartido.message }, { status: 500 })

  const ventanaAbierta =
    partido.estado === 'pendiente' &&
    Date.now() < new Date(partido.fecha_hora).getTime() - 5 * 60 * 1000

  const { data: usuarios, error: errU } = await supabase
    .from('usuarios')
    .select('id, nombre')
    .eq('liga_id', ligaId)

  if (errU) return NextResponse.json({ error: errU.message }, { status: 500 })
  if (!usuarios?.length) {
    return NextResponse.json({ bloqueado: false, total: 0, predicciones: [] })
  }

  const ids = usuarios.map((u) => u.id)
  const nombreMap = new Map(usuarios.map((u) => [u.id, u.nombre]))

  const { data: predicciones, error: errP } = await supabase
    .from('predicciones')
    .select('usuario_id, goles_local, goles_visitante, fichas_apostadas, tipo_acierto, acertado, ganancia_fichas')
    .eq('partido_id', partidoId)
    .in('usuario_id', ids)

  if (errP) return NextResponse.json({ error: errP.message }, { status: 500 })

  const todas = predicciones ?? []
  const yoPredije = !!usuarioId && todas.some((p) => p.usuario_id === usuarioId)

  // Mientras la ventana siga abierta y el usuario no haya predicho, se ocultan
  // las predicciones ajenas para evitar la copia. Una vez que predijo (o cuando
  // cierra la ventana) hay transparencia total.
  const bloqueado = ventanaAbierta && !yoPredije

  const visibles = bloqueado ? [] : todas

  const result = visibles.map((p) => ({
    usuario_id:       p.usuario_id,
    nombre:           nombreMap.get(p.usuario_id) ?? 'Desconocido',
    goles_local:      p.goles_local,
    goles_visitante:  p.goles_visitante,
    fichas_apostadas: p.fichas_apostadas,
    tipo_acierto:     p.tipo_acierto,
    acertado:         p.acertado,
    ganancia_fichas:  p.ganancia_fichas,
  }))

  return NextResponse.json({ bloqueado, total: todas.length, predicciones: result })
}
