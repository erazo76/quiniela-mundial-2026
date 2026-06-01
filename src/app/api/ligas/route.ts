import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generarCodigo(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(req: NextRequest) {
  const { nombreUsuario, nombreLiga, pin, cierreInscripcion, tipo } = await req.json()

  if (!nombreUsuario?.trim() || !nombreLiga?.trim() || !pin || String(pin).length !== 4) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const ligaTipo: 'vip' | 'junior' = tipo === 'junior' ? 'junior' : 'vip'

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

  // Cierre de inscripción: explícito si se pasa, sino 5 min antes del primer partido
  let cierreCalculado: string | null = cierreInscripcion ?? null
  if (!cierreCalculado) {
    const { data: primerPartido } = await supabase
      .from('partidos')
      .select('fecha_hora')
      .order('fecha_hora', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (primerPartido?.fecha_hora) {
      const cierre = new Date(primerPartido.fecha_hora)
      cierre.setMinutes(cierre.getMinutes() - 5)
      cierreCalculado = cierre.toISOString()
    }
  }

  const insertPayload: Record<string, unknown> = {
    nombre_liga: nombreLiga.trim(),
    codigo_invitacion: codigo,
    tipo: ligaTipo,
  }
  if (cierreCalculado) insertPayload.cierre_inscripcion = cierreCalculado

  const { data: liga, error: ligaError } = await supabase
    .from('ligas')
    .insert(insertPayload)
    .select()
    .single()

  if (ligaError || !liga) {
    return NextResponse.json({ error: 'Error al crear la liga' }, { status: 500 })
  }

  const fichasIniciales = ligaTipo === 'junior' ? 0 : 1000
  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .insert({ nombre: nombreUsuario.trim(), liga_id: liga.id, pin: String(pin), fichas: fichasIniciales })
    .select()
    .single()

  if (usuarioError || !usuario) {
    return NextResponse.json({ error: 'Error al crear el usuario' }, { status: 500 })
  }

  return NextResponse.json({ usuario, liga })
}
