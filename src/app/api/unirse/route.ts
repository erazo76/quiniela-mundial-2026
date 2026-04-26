import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { nombreUsuario, codigoInvitacion } = await req.json()

  if (!nombreUsuario?.trim() || !codigoInvitacion?.trim()) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: liga, error: ligaError } = await supabase
    .from('ligas')
    .select()
    .eq('codigo_invitacion', codigoInvitacion.toUpperCase().trim())
    .maybeSingle()

  if (ligaError || !liga) {
    return NextResponse.json({ error: 'Código de invitación inválido' }, { status: 404 })
  }

  // Si ya existe un usuario con ese nombre en esa liga, lo devolvemos
  const { data: existente } = await supabase
    .from('usuarios')
    .select()
    .eq('liga_id', liga.id)
    .ilike('nombre', nombreUsuario.trim())
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ usuario: existente, liga })
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .insert({ nombre: nombreUsuario.trim(), liga_id: liga.id })
    .select()
    .single()

  if (usuarioError || !usuario) {
    return NextResponse.json({ error: 'Error al unirse a la liga' }, { status: 500 })
  }

  return NextResponse.json({ usuario, liga })
}
