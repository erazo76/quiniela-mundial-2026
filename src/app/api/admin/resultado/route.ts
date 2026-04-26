import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'
import { procesarResultadoPartido } from '@/lib/calcular-resultado'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, partido_id, resultado_local, resultado_visitante, estado } = body

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!partido_id || resultado_local == null || resultado_visitante == null || !estado) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: partidoActual } = await supabase
    .from('partidos')
    .select('estado')
    .eq('id', partido_id)
    .single()

  const yaFinalizado = partidoActual?.estado === 'finalizado'

  const { error: errPartido } = await supabase
    .from('partidos')
    .update({ resultado_local, resultado_visitante, estado })
    .eq('id', partido_id)

  if (errPartido) return NextResponse.json({ error: errPartido.message }, { status: 500 })

  if (estado !== 'finalizado' || yaFinalizado) {
    return NextResponse.json({ ok: true, procesadas: 0 })
  }

  const { procesadas, error } = await procesarResultadoPartido(
    supabase,
    partido_id,
    resultado_local,
    resultado_visitante
  )

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true, procesadas })
}
