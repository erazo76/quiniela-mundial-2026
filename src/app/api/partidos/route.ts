import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const usuarioId = req.nextUrl.searchParams.get('usuario_id')
  const fase = req.nextUrl.searchParams.get('fase') ?? 'grupos'

  const supabase = createAdminClient()

  const query = supabase
    .from('partidos')
    .select('*')
    .order('fecha_hora', { ascending: true })

  if (fase !== 'all') {
    query.eq('fase', fase)
  }

  const { data: partidos, error: errorPartidos } = await query

  if (errorPartidos) {
    return NextResponse.json({ error: errorPartidos.message }, { status: 500 })
  }

  if (!usuarioId || !partidos?.length) {
    return NextResponse.json(partidos ?? [])
  }

  const { data: predicciones, error: errorPred } = await supabase
    .from('predicciones')
    .select('*')
    .eq('usuario_id', usuarioId)

  if (errorPred) {
    return NextResponse.json({ error: errorPred.message }, { status: 500 })
  }

  const predMap = new Map((predicciones ?? []).map((p) => [p.partido_id, p]))

  const result = partidos.map((partido) => ({
    ...partido,
    prediccion: predMap.get(partido.id) ?? null,
  }))

  return NextResponse.json(result)
}
