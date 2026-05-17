import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { codigoInvitacion, usuarioId, nombreUsuario, pin } = await req.json()

  if (!codigoInvitacion?.trim() || !pin || String(pin).length !== 4) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: liga } = await supabase
    .from('ligas')
    .select()
    .eq('codigo_invitacion', codigoInvitacion.toUpperCase().trim())
    .maybeSingle()

  if (!liga) {
    return NextResponse.json({ error: 'Código de invitación no válido' }, { status: 404 })
  }

  // Caso: usuario existente
  if (usuarioId) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select()
      .eq('id', usuarioId)
      .eq('liga_id', liga.id)
      .maybeSingle()

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado en esta liga' }, { status: 404 })
    }

    // Sin PIN aún (migración o primera vez con flujo nuevo): asignar PIN
    if (usuario.pin === null) {
      await supabase.from('usuarios').update({ pin: String(pin) }).eq('id', usuarioId)
      return NextResponse.json({ usuario: { ...usuario, pin }, liga })
    }

    if (usuario.pin !== String(pin)) {
      return NextResponse.json({ error: 'PIN incorrecto. Intenta de nuevo.' }, { status: 401 })
    }

    return NextResponse.json({ usuario, liga })
  }

  // Caso: usuario nuevo — verificar que la liga aún recibe participantes
  if (nombreUsuario?.trim()) {
    if (liga.cierre_inscripcion && new Date() > new Date(liga.cierre_inscripcion)) {
      return NextResponse.json(
        { error: 'Esta liga ya no acepta nuevos participantes.' },
        { status: 403 }
      )
    }

    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('liga_id', liga.id)
      .ilike('nombre', nombreUsuario.trim())
      .maybeSingle()

    if (existente) {
      return NextResponse.json(
        { error: `Ya hay un "${nombreUsuario.trim()}" en esta liga. Elige un nombre diferente.` },
        { status: 409 }
      )
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert({ nombre: nombreUsuario.trim(), liga_id: liga.id, pin: String(pin) })
      .select()
      .single()

    if (error || !usuario) {
      return NextResponse.json({ error: 'Error al unirse a la liga' }, { status: 500 })
    }

    return NextResponse.json({ usuario, liga })
  }

  return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
}
