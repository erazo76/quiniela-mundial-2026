import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'
import { resolverTrasResultado } from '@/lib/resolver-fase'

/**
 * Re-runs the bracket resolver for every finalized match.
 * Useful when results were loaded before the resolver existed,
 * or after a simulation that completed groups.
 *
 * POST /api/admin/backfill-bracket  { token }
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Two passes ensure group resolution populates dieciseisavos names
  // before those names propagate further into octavos, cuartos, etc.
  const PASADAS = [
    ['grupos'],
    ['dieciseisavos', 'octavos', 'cuartos', 'semis'],
  ]

  let procesados = 0

  for (const fases of PASADAS) {
    for (const fase of fases) {
      const { data: partidos } = await supabase
        .from('partidos')
        .select('id, ganador')
        .eq('fase', fase)
        .eq('estado', 'finalizado')
        .order('fecha_hora', { ascending: true })

      if (!partidos?.length) continue

      for (const p of partidos) {
        await resolverTrasResultado(supabase, p.id, p.ganador ?? undefined)
        procesados++
      }
    }
  }

  return NextResponse.json({ ok: true, procesados })
}
