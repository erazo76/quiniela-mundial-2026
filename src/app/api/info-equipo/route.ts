import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const local = req.nextUrl.searchParams.get('local')
  const visitante = req.nextUrl.searchParams.get('visitante')

  const nombres = [local, visitante].filter(Boolean) as string[]
  if (!nombres.length) return NextResponse.json({})

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('info_equipos')
    .select('nombre_pais, dato_freak_1, dato_freak_2, dato_freak_3, figura_clave_nombre, mejor_puesto_mundial, participaciones')
    .in('nombre_pais', nombres)

  if (error) return NextResponse.json({}, { status: 500 })

  const result: Record<string, (typeof data)[0]> = {}
  for (const eq of data ?? []) {
    result[eq.nombre_pais] = eq
  }
  return NextResponse.json(result)
}
