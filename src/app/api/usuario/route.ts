import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, liga_id, fichas, racha, bono_usado')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: predicciones } = await supabase
    .from('predicciones')
    .select('acertado')
    .eq('usuario_id', id)

  const total = predicciones?.length ?? 0
  const acertadas = predicciones?.filter((p) => p.acertado).length ?? 0

  return NextResponse.json({
    ...data,
    predicciones_total: total,
    predicciones_acertadas: acertadas,
  })
}
