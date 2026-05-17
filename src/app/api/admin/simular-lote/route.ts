import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'
import { procesarResultadoPartido } from '@/lib/calcular-resultado'
import { resolverTrasResultado } from '@/lib/resolver-fase'

const LOTE_POR_FASE: Record<string, number> = {
  grupos:        10,
  dieciseisavos:  5,
  octavos:        8,
  cuartos:        4,
  semis:          2,
  tercer_puesto:  1,
  final:          1,
}

const FASES_ELIM = new Set(['dieciseisavos','octavos','cuartos','semis','tercer_puesto','final'])

function randomScore(): [number, number] {
  const pool = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4]
  return [
    pool[Math.floor(Math.random() * pool.length)],
    pool[Math.floor(Math.random() * pool.length)],
  ]
}

function penalesAleatorios(fase: string, rl: number, rv: number) {
  if (!FASES_ELIM.has(fase) || rl !== rv) return null
  const pool = [3, 4, 4, 5, 5, 5, 6, 7]
  let pl = 0, pv = 0
  while (pl === pv) {
    pl = pool[Math.floor(Math.random() * pool.length)]
    pv = pool[Math.floor(Math.random() * pool.length)]
  }
  return { penales_local: pl, penales_visitante: pv }
}

export async function POST(req: NextRequest) {
  const { token, fase } = await req.json()

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!fase) {
    return NextResponse.json({ error: 'Falta el campo fase' }, { status: 400 })
  }

  const cantidad = LOTE_POR_FASE[fase] ?? 5
  const supabase = createAdminClient()

  const { data: pendientes, error: errQ } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, fase')
    .eq('fase', fase)
    .eq('estado', 'pendiente')
    .order('fecha_hora', { ascending: true })
    .limit(cantidad)

  if (errQ) return NextResponse.json({ error: errQ.message }, { status: 500 })
  if (!pendientes?.length) {
    return NextResponse.json({ ok: true, procesados: 0, partidos: [] })
  }

  const partidos: Array<{
    id: string
    equipo_local: string
    equipo_visitante: string
    resultado_local: number
    resultado_visitante: number
    penales_local: number | null
    penales_visitante: number | null
    estado: string
  }> = []

  for (const partido of pendientes) {
    const [rl, rv] = randomScore()
    const pen = penalesAleatorios(fase, rl, rv)

    const totalLocal     = rl + (pen?.penales_local     ?? 0)
    const totalVisitante = rv + (pen?.penales_visitante ?? 0)

    const updateData: Record<string, unknown> = {
      resultado_local:     totalLocal,
      resultado_visitante: totalVisitante,
      estado: 'finalizado',
    }
    if (pen) {
      updateData.penales_local     = pen.penales_local
      updateData.penales_visitante = pen.penales_visitante
    }

    const { error: errUpd } = await supabase
      .from('partidos')
      .update(updateData)
      .eq('id', partido.id)

    if (errUpd) continue

    await procesarResultadoPartido(
      supabase,
      partido.id,
      totalLocal,
      totalVisitante,
      partido.equipo_local,
      partido.equipo_visitante
    )

    await resolverTrasResultado(supabase, partido.id)

    partidos.push({
      id: partido.id,
      equipo_local:        partido.equipo_local,
      equipo_visitante:    partido.equipo_visitante,
      resultado_local:     totalLocal,
      resultado_visitante: totalVisitante,
      penales_local:       pen?.penales_local     ?? null,
      penales_visitante:   pen?.penales_visitante ?? null,
      estado: 'finalizado',
    })
  }

  return NextResponse.json({ ok: true, procesados: partidos.length, partidos })
}
