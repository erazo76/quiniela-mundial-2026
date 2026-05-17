import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Umbral de participación mínima para ser elegible al podio
// Se activa solo cuando hay al menos MIN_PARTIDOS_PARA_EVALUAR finalizados
const MIN_PARTICIPACION_PCT  = 0.20
const MIN_PARTIDOS_EVALUAR   = 5

export async function GET(req: NextRequest) {
  const ligaId = req.nextUrl.searchParams.get('liga_id')
  if (!ligaId) return NextResponse.json({ error: 'liga_id requerido' }, { status: 400 })

  const supabase = createAdminClient()

  const [
    { data: liga },
    { data: usuarios, error: errUsuarios },
    { count: totalFinalizados },
  ] = await Promise.all([
    supabase.from('ligas').select('pote_virtual').eq('id', ligaId).single(),
    supabase.from('usuarios').select('id, nombre, fichas, racha, bono_usado').eq('liga_id', ligaId),
    supabase.from('partidos').select('id', { count: 'exact', head: true }).eq('estado', 'finalizado'),
  ])

  if (errUsuarios) return NextResponse.json({ error: errUsuarios.message }, { status: 500 })
  if (!usuarios?.length) return NextResponse.json({ ranking: [], pote: 0 })

  const partidos_finalizados = totalFinalizados ?? 0
  const ids = usuarios.map((u) => u.id)

  const { data: predicciones, error: errPred } = await supabase
    .from('predicciones')
    .select('usuario_id, acertado')
    .in('usuario_id', ids)

  if (errPred) return NextResponse.json({ error: errPred.message }, { status: 500 })

  const statsMap = new Map<string, { total: number; acertadas: number }>()
  for (const p of predicciones ?? []) {
    const s = statsMap.get(p.usuario_id) ?? { total: 0, acertadas: 0 }
    s.total += 1
    if (p.acertado) s.acertadas += 1
    statsMap.set(p.usuario_id, s)
  }

  // Mínimo de predicciones requeridas para no ser espectador
  const minPredRequeridas = partidos_finalizados >= MIN_PARTIDOS_EVALUAR
    ? Math.max(1, Math.floor(partidos_finalizados * MIN_PARTICIPACION_PCT))
    : 0 // aún no hay suficientes partidos para evaluar

  const entries = usuarios.map((u) => {
    const stats = statsMap.get(u.id) ?? { total: 0, acertadas: 0 }
    const es_espectador = minPredRequeridas > 0 && stats.total < minPredRequeridas
    return {
      id: u.id,
      nombre: u.nombre,
      fichas: u.fichas,
      racha: u.racha,
      bono_usado: u.bono_usado,
      predicciones_total: stats.total,
      predicciones_acertadas: stats.acertadas,
      partidos_finalizados,
      es_espectador,
    }
  })

  // Activos primero (por fichas desc), espectadores al final (por fichas desc)
  const activos     = entries.filter(e => !e.es_espectador).sort((a, b) => b.fichas - a.fichas)
  const espectadores = entries.filter(e => e.es_espectador).sort((a, b) => b.fichas - a.fichas)
  const sorted = [...activos, ...espectadores]

  const ranking = sorted.map((e, i) => ({ posicion: i + 1, ...e }))

  return NextResponse.json({ ranking, pote: liga?.pote_virtual ?? 0 })
}
