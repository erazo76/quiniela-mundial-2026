import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generarCodigo(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(req: NextRequest) {
  const { nombreUsuario, nombreLiga, pin } = await req.json()

  if (!nombreUsuario?.trim() || !nombreLiga?.trim() || !pin || String(pin).length !== 4) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Generar código único
  let codigo = generarCodigo()
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase
      .from('ligas')
      .select('id')
      .eq('codigo_invitacion', codigo)
      .maybeSingle()
    if (!data) break
    codigo = generarCodigo()
  }

  const { data: liga, error: ligaError } = await supabase
    .from('ligas')
    .insert({ nombre_liga: nombreLiga.trim(), codigo_invitacion: codigo })
    .select()
    .single()

  if (ligaError || !liga) {
    return NextResponse.json({ error: 'Error al crear la liga' }, { status: 500 })
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .insert({ nombre: nombreUsuario.trim(), liga_id: liga.id, pin: String(pin) })
    .select()
    .single()

  if (usuarioError || !usuario) {
    return NextResponse.json({ error: 'Error al crear el usuario' }, { status: 500 })
  }

  return NextResponse.json({ usuario, liga })
}
