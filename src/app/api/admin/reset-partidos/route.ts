import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

/**
 * Resets ALL match results for testing:
 * - grupos/dieciseisavos: clears resultado_local/visitante, ganador, estado → pendiente
 * - octavos/cuartos/semis/tercer_puesto/final: restores placeholder team names + pendiente
 *
 * POST /api/admin/reset-partidos  { token }
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Reset grupos + dieciseisavos: keep team names/flags, clear results
  await supabase
    .from('partidos')
    .update({ resultado_local: null, resultado_visitante: null, estado: 'pendiente', ganador: null })
    .in('fase', ['grupos', 'dieciseisavos'])

  // Reset knockout bracket to original placeholders (order by fecha_hora gives positions)
  const FASES_KNOCKOUT: Array<{ fase: string; local: (n: number) => string; visitante: (n: number) => string }> = [
    { fase: 'octavos',       local: n => `Ganador D32-${n*2-1}`, visitante: n => `Ganador D32-${n*2}` },
    { fase: 'cuartos',       local: n => `Ganador O${n*2-1}`,    visitante: n => `Ganador O${n*2}` },
    { fase: 'semis',         local: n => `Ganador C${n*2-1}`,    visitante: n => `Ganador C${n*2}` },
    { fase: 'tercer_puesto', local: () => 'Perdedor S1',         visitante: () => 'Perdedor S2' },
    { fase: 'final',         local: () => 'Ganador S1',          visitante: () => 'Ganador S2' },
  ]

  for (const { fase, local, visitante } of FASES_KNOCKOUT) {
    const { data } = await supabase
      .from('partidos')
      .select('id')
      .eq('fase', fase)
      .order('fecha_hora', { ascending: true })

    if (!data?.length) continue

    for (let i = 0; i < data.length; i++) {
      await supabase.from('partidos').update({
        equipo_local: local(i + 1),
        equipo_visitante: visitante(i + 1),
        bandera_local: null,
        bandera_visitante: null,
        resultado_local: null,
        resultado_visitante: null,
        estado: 'pendiente',
        ganador: null,
      }).eq('id', data[i].id)
    }
  }

  return NextResponse.json({ ok: true })
}
