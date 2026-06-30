import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'
import { procesarResultadoPartido, reprocesarResultadoPartido } from '@/lib/calcular-resultado'
import { resolverTrasResultado } from '@/lib/resolver-fase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    token,
    partido_id,
    resultado_local,
    resultado_visitante,
    estado,
    ganador_manual,
    penales_local,
    penales_visitante,
  } = body

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
  const esEmpateRegulacion = resultado_local === resultado_visitante

  // Calcular totales incluyendo penales si los hay
  const tenePenales =
    penales_local != null &&
    penales_visitante != null &&
    esEliminatoria &&
    esEmpateRegulacion
  const totalLocal = resultado_local + (tenePenales ? penales_local : 0)
  const totalVisitante = resultado_visitante + (tenePenales ? penales_visitante : 0)
  const esEmpateTotal = totalLocal === totalVisitante

  // En eliminatoria con empate en regulación: necesita penales o ganador_manual
  if (estado === 'finalizado' && esEliminatoria && esEmpateRegulacion && !tenePenales && !ganador_manual) {
    return NextResponse.json(
      { error: 'Partido empatado en eliminatoria: ingresa los goles en penales' },
      { status: 400 }
    )
  }

  // Con penales debe haber un ganador claro en el total
  if (estado === 'finalizado' && esEliminatoria && tenePenales && esEmpateTotal) {
    return NextResponse.json(
      { error: 'El marcador total (regulación + penales) no puede quedar empatado' },
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = {
    resultado_local: totalLocal,
    resultado_visitante: totalVisitante,
    estado,
  }

  if (tenePenales) {
    updateData.penales_local = penales_local
    updateData.penales_visitante = penales_visitante
  }

  const { error: errPartido } = await supabase
    .from('partidos')
    .update(updateData)
    .eq('id', partido_id)

  if (errPartido) return NextResponse.json({ error: errPartido.message }, { status: 500 })

  // Cambió a pendiente/en_vivo: solo se actualizó la fila (la reversión de fichas
  // ya distribuidas no se maneja por aquí). La re-corrección de un partido se hace
  // finalizado → finalizado, vía el reproceso idempotente de abajo.
  if (estado !== 'finalizado') {
    return NextResponse.json({ ok: true, procesadas: 0 })
  }

  // ── Re-corrección de un partido YA finalizado ────────────────────────────────
  // Caso típico: la API guardó un cruce de eliminatoria como empate sin penales
  // (ganador null, bracket trabado). El admin reabre, carga la tanda y re-scorea.
  // Se usa el reproceso idempotente (ajuste por delta) para no duplicar fichas, y
  // luego se reavanza el bracket con el nuevo total/ganador.
  if (yaFinalizado) {
    const { procesadas, corregidas, error } = await reprocesarResultadoPartido(
      supabase,
      partido_id,
      totalLocal,
      totalVisitante,
      partidoActual?.equipo_local ?? 'Local',
      partidoActual?.equipo_visitante ?? 'Visitante'
    )

    if (error) return NextResponse.json({ error }, { status: 500 })

    await resolverTrasResultado(supabase, partido_id, ganador_manual ?? undefined)

    return NextResponse.json({ ok: true, procesadas, corregidas, recalculado: true })
  }

  // ── Primera finalización ─────────────────────────────────────────────────────
  // Procesar fichas de los participantes usando el total
  const { procesadas, error } = await procesarResultadoPartido(
    supabase,
    partido_id,
    totalLocal,
    totalVisitante,
    partidoActual?.equipo_local ?? 'Local',
    partidoActual?.equipo_visitante ?? 'Visitante'
  )

  if (error) return NextResponse.json({ error }, { status: 500 })

  // Resolver bracket — el ganador se determina del marcador total en la DB
  // ganador_manual solo actúa como fallback si el total queda igualado (no debería ocurrir)
  await resolverTrasResultado(supabase, partido_id, ganador_manual ?? undefined)

  return NextResponse.json({ ok: true, procesadas })
}
