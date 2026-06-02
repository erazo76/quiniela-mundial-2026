import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const usuarioId = req.nextUrl.searchParams.get('usuario_id')
  const ligaId    = req.nextUrl.searchParams.get('liga_id')
  if (!usuarioId || !ligaId) {
    return NextResponse.json({ error: 'usuario_id y liga_id requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verificar que el usuario pertenece a la liga
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', usuarioId)
    .eq('liga_id', ligaId)
    .maybeSingle()

  if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado en esta liga' }, { status: 404 })

  const { data: partidos, error: errPartidos } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, bandera_local, bandera_visitante, resultado_local, resultado_visitante, fecha_hora, fase')
    .eq('estado', 'finalizado')
    .order('fecha_hora', { ascending: false })

  if (errPartidos) return NextResponse.json({ error: errPartidos.message }, { status: 500 })
  if (!partidos?.length) return NextResponse.json([])

  const partidoIds = partidos.map((p) => p.id)

  const { data: predicciones, error: errPred } = await supabase
    .from('predicciones')
    .select('partido_id, goles_local, goles_visitante, fichas_apostadas, tipo_acierto, acertado, ganancia_fichas')
    .eq('usuario_id', usuarioId)
    .in('partido_id', partidoIds)

  if (errPred) return NextResponse.json({ error: errPred.message }, { status: 500 })

  const predMap = new Map((predicciones ?? []).map((p) => [p.partido_id, p]))

  const result = partidos
    .filter((p) => predMap.has(p.id))
    .map((p) => {
      const pred = predMap.get(p.id)!
      return {
        partido_id:       p.id,
        equipo_local:     p.equipo_local,
        equipo_visitante: p.equipo_visitante,
        bandera_local:    p.bandera_local,
        bandera_visitante: p.bandera_visitante,
        resultado_local:  p.resultado_local,
        resultado_visitante: p.resultado_visitante,
        fecha_hora:       p.fecha_hora,
        fase:             p.fase,
        goles_local:      pred.goles_local,
        goles_visitante:  pred.goles_visitante,
        fichas_apostadas: pred.fichas_apostadas,
        tipo_acierto:     pred.tipo_acierto,
        acertado:         pred.acertado,
        ganancia_fichas:  pred.ganancia_fichas,
      }
    })

  return NextResponse.json(result)
}
