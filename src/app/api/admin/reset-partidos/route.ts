import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

/**
 * Resets ALL match results and returns every league to its initial state:
 * - predicciones: deleted entirely
 * - historial_fichas: deleted entirely
 * - usuarios: fichas → 1000, racha → 0, bono_usado → false
 * - ligas: pote_virtual → 0
 * - partidos: cleared results, estado → pendiente, knockout brackets → placeholders
 *
 * POST /api/admin/reset-partidos  { token }
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // ─── 1. Borrar predicciones e historial ───────────────────────────────────
  await supabase.from('predicciones').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('historial_fichas').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // ─── 2. Restaurar usuarios a estado inicial ────────────────────────────────
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nombre, liga_id')

  if (usuarios?.length) {
    await supabase.from('usuarios').upsert(
      usuarios.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        liga_id: u.liga_id,
        fichas: 1000,
        racha: 0,
        bono_usado: false,
      }))
    )
  }

  // ─── 3. Resetear pote de todas las ligas ──────────────────────────────────
  await supabase.from('ligas').update({ pote_virtual: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')

  // ─── 4. Resetear partidos ──────────────────────────────────────────────────

  await supabase
    .from('partidos')
    .update({
      resultado_local: null,
      resultado_visitante: null,
      penales_local: null,
      penales_visitante: null,
      estado: 'pendiente',
      ganador: null,
    })
    .eq('fase', 'grupos')

  const DIECISEISAVOS_PH = [
    { local: '1E',  visitante: '3°(ABCDF)' },
    { local: '1I',  visitante: '3°(CDFGH)' },
    { local: '2A',  visitante: '2B'        },
    { local: '1F',  visitante: '2C'        },
    { local: '2K',  visitante: '2L'        },
    { local: '1H',  visitante: '2J'        },
    { local: '1D',  visitante: '3°(BEFIJ)' },
    { local: '1G',  visitante: '3°(AEHIJ)' },
    { local: '1C',  visitante: '2F'        },
    { local: '2E',  visitante: '2I'        },
    { local: '1A',  visitante: '3°(CEFHI)' },
    { local: '1L',  visitante: '3°(EHIJK)' },
    { local: '1J',  visitante: '2H'        },
    { local: '2D',  visitante: '2G'        },
    { local: '1B',  visitante: '3°(EFGIJ)' },
    { local: '1K',  visitante: '3°(DEIJL)' },
  ]

  const { data: d32 } = await supabase
    .from('partidos')
    .select('id')
    .eq('fase', 'dieciseisavos')
    .order('fecha_hora', { ascending: true })

  if (d32?.length) {
    for (let i = 0; i < d32.length; i++) {
      const ph = DIECISEISAVOS_PH[i]
      if (!ph) continue
      await supabase.from('partidos').update({
        equipo_local: ph.local,
        equipo_visitante: ph.visitante,
        bandera_local: null,
        bandera_visitante: null,
        resultado_local: null,
        resultado_visitante: null,
        penales_local: null,
        penales_visitante: null,
        estado: 'pendiente',
        ganador: null,
      }).eq('id', d32[i].id)
    }
  }

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
        penales_local: null,
        penales_visitante: null,
        estado: 'pendiente',
        ganador: null,
      }).eq('id', data[i].id)
    }
  }

  return NextResponse.json({ ok: true })
}
