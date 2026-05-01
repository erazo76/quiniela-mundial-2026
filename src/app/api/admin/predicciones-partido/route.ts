import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-admin-token')
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const partidoId = req.nextUrl.searchParams.get('partido_id')
  if (!partidoId) return NextResponse.json({ error: 'partido_id requerido' }, { status: 400 })

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('predicciones')
    .select('id, goles_local, goles_visitante, fichas_apostadas, tipo_acierto, acertado, ganancia_fichas, usuarios(nombre)')
    .eq('partido_id', partidoId)
    .order('fichas_apostadas', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data ?? []).map((p) => ({
      id: p.id,
      nombre: (p.usuarios as unknown as { nombre: string } | null)?.nombre ?? 'Desconocido',
      pred: `${p.goles_local}-${p.goles_visitante}`,
      fichas: p.fichas_apostadas,
      tipo_acierto: p.tipo_acierto,
      acertado: p.acertado,
      ganancia: p.ganancia_fichas,
    }))
  )
}
