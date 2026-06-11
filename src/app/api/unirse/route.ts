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

  // Caso: usuario nuevo — la inscripción está siempre abierta.
  // Un jugador que se une tarde no podrá predecir los partidos que ya cerraron
  // (cada partido bloquea sus predicciones 5 min antes del kickoff), por lo que
  // simplemente no suma en esos partidos. No hay fecha límite para unirse.
  if (nombreUsuario?.trim()) {
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

    const fichasIniciales = liga.tipo === 'junior' ? 0 : 1000
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert({ nombre: nombreUsuario.trim(), liga_id: liga.id, pin: String(pin), fichas: fichasIniciales })
      .select()
      .single()

    if (error || !usuario) {
      return NextResponse.json({ error: 'Error al unirse a la liga' }, { status: 500 })
    }

    return NextResponse.json({ usuario, liga })
  }

  return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
}
