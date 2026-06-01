import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const codigo = req.nextUrl.searchParams.get('codigo')
  if (!codigo) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: liga } = await supabase
    .from('ligas')
    .select('id, nombre_liga, codigo_invitacion, tipo')
    .eq('codigo_invitacion', codigo.toUpperCase().trim())
    .maybeSingle()

  if (!liga) {
    return NextResponse.json(
      { error: 'Código no válido. Verifica que esté bien escrito.' },
      { status: 404 }
    )
  }

  const { data: miembros } = await supabase
    .from('usuarios')
    .select('id, nombre, pin')
    .eq('liga_id', liga.id)
    .order('nombre')

  return NextResponse.json({
    liga: { id: liga.id, nombre_liga: liga.nombre_liga, codigo_invitacion: liga.codigo_invitacion, tipo: liga.tipo ?? 'vip' },
    miembros: (miembros ?? []).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      tienePin: m.pin !== null,
    })),
  })
}
