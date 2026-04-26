import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const ligaId = req.nextUrl.searchParams.get('liga_id')
  if (!ligaId) return NextResponse.json({ error: 'liga_id requerido' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: usuarios, error: errUsuarios } = await supabase
    .from('usuarios')
    .select('id, nombre, fichas, racha, bono_usado')
    .eq('liga_id', ligaId)
    .order('fichas', { ascending: false })

  if (errUsuarios) return NextResponse.json({ error: errUsuarios.message }, { status: 500 })
  if (!usuarios?.length) return NextResponse.json([])

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

  const resultado = usuarios.map((u, i) => {
    const stats = statsMap.get(u.id) ?? { total: 0, acertadas: 0 }
    return {
      posicion: i + 1,
      id: u.id,
      nombre: u.nombre,
      fichas: u.fichas,
      racha: u.racha,
      bono_usado: u.bono_usado,
      predicciones_total: stats.total,
      predicciones_acertadas: stats.acertadas,
    }
  })

  return NextResponse.json(resultado)
}
