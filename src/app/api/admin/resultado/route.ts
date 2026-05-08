import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'
import { procesarResultadoPartido } from '@/lib/calcular-resultado'
import { resolverTrasResultado } from '@/lib/resolver-fase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, partido_id, resultado_local, resultado_visitante, estado, ganador_manual } = body

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!partido_id || resultado_local == null || resultado_visitante == null || !estado) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: partidoActual } = await supabase
    .from('partidos')
    .select('estado, fase, equipo_local, equipo_visitante')
    .eq('id', partido_id)
    .single()

  const yaFinalizado = partidoActual?.estado === 'finalizado'
  const esEliminatoria = partidoActual?.fase !== 'grupos'
  const esEmpate = resultado_local === resultado_visitante

  // En eliminatoria con empate el admin DEBE indicar el ganador
  if (estado === 'finalizado' && esEliminatoria && esEmpate && !ganador_manual) {
    return NextResponse.json(
      { error: 'Partido empatado en eliminatoria: indicá quién ganó en penales (ganador_manual)' },
      { status: 400 }
    )
  }

  const { error: errPartido } = await supabase
    .from('partidos')
    .update({ resultado_local, resultado_visitante, estado })
    .eq('id', partido_id)

  if (errPartido) return NextResponse.json({ error: errPartido.message }, { status: 500 })

  if (estado !== 'finalizado' || yaFinalizado) {
    return NextResponse.json({ ok: true, procesadas: 0 })
  }

  // Procesar fichas de los participantes
  const { procesadas, error } = await procesarResultadoPartido(
    supabase,
    partido_id,
    resultado_local,
    resultado_visitante,
    partidoActual?.equipo_local ?? 'Local',
    partidoActual?.equipo_visitante ?? 'Visitante'
  )

  if (error) return NextResponse.json({ error }, { status: 500 })

  // Resolver bracket (actualiza equipo_local/visitante de la siguiente fase)
  await resolverTrasResultado(supabase, partido_id, ganador_manual ?? undefined)

  return NextResponse.json({ ok: true, procesadas })
}
