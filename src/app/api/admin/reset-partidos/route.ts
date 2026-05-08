import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

/**
 * Resets ALL match results for testing:
 * - grupos/dieciseisavos: clears resultado_local/visitante, ganador, estado → pendiente
 * - octavos/cuartos/semis/tercer_puesto/final: restores placeholder team names + pendiente
 * - predicciones: reverts scoring (ganancia_fichas subtracted from user fichas, racha/bono reset)
 * - historial_fichas: removes result-related entries
 *
 * POST /api/admin/reset-partidos  { token }
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // ─── 1. Revertir scoring de predicciones ───────────────────────────────────

  // Obtener todas las predicciones ya puntuadas
  const { data: scoredPreds } = await supabase
    .from('predicciones')
    .select('usuario_id, ganancia_fichas')
    .not('tipo_acierto', 'is', null)

  // Obtener bonos de rescate otorgados
  const { data: bonos } = await supabase
    .from('historial_fichas')
    .select('usuario_id, cantidad')
    .eq('tipo', 'bono_rescate')

  // Acumular delta por usuario: ganancia_fichas + bono_rescate a descontar
  const delta = new Map<string, number>()
  for (const p of scoredPreds ?? []) {
    delta.set(p.usuario_id, (delta.get(p.usuario_id) ?? 0) + (p.ganancia_fichas ?? 0))
  }
  for (const b of bonos ?? []) {
    delta.set(b.usuario_id, (delta.get(b.usuario_id) ?? 0) + (b.cantidad ?? 0))
  }

  if (delta.size > 0) {
    const usuarioIds = [...delta.keys()]
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, nombre, liga_id, fichas, racha, bono_usado')
      .in('id', usuarioIds)

    const updatesUsuarios = (usuarios ?? []).map((u) => ({
      id: u.id,
      nombre: u.nombre,
      liga_id: u.liga_id,
      fichas: Math.max(0, u.fichas - (delta.get(u.id) ?? 0)),
      racha: 0,
      bono_usado: false,
    }))

    if (updatesUsuarios.length > 0) {
      await supabase.from('usuarios').upsert(updatesUsuarios)
    }
  }

  // Resetear predicciones a estado no puntuado
  await supabase
    .from('predicciones')
    .update({ ganancia_fichas: 0, tipo_acierto: null, acertado: false })
    .not('tipo_acierto', 'is', null)

  // Eliminar historial relacionado con resultados de partidos
  await supabase
    .from('historial_fichas')
    .delete()
    .in('tipo', ['exacto', 'ganador', 'bono_rescate'])

  // ─── 2. Resetear partidos ──────────────────────────────────────────────────

  // Reset grupos: keep team names/flags, clear results only
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

  // Reset dieciseisavos: restore original FIFA 2026 bracket placeholders (ordered by fecha_hora)
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
        penales_local: null,
        penales_visitante: null,
        estado: 'pendiente',
        ganador: null,
      }).eq('id', data[i].id)
    }
  }

  return NextResponse.json({ ok: true })
}
