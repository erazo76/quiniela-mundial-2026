import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest) {
  const { token, ligaId, cierreInscripcion, nombre } = await req.json()
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!ligaId) return NextResponse.json({ error: 'ligaId requerido' }, { status: 400 })

  const supabase = createAdminClient()

  const cambios: Record<string, unknown> = {}
  if (nombre !== undefined) {
    const limpio = String(nombre).trim()
    if (!limpio) return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
    cambios.nombre_liga = limpio
  }
  if (cierreInscripcion !== undefined) {
    cambios.cierre_inscripcion = cierreInscripcion ?? null
  }
  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const { error } = await supabase
    .from('ligas')
    .update(cambios)
    .eq('id', ligaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { token, ligaId } = await req.json()
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!ligaId) return NextResponse.json({ error: 'ligaId requerido' }, { status: 400 })

  const supabase = createAdminClient()

  // 1. Borrar usuarios de la liga (predicciones e historial_fichas se borran en cascade)
  const { error: errUsuarios } = await supabase
    .from('usuarios')
    .delete()
    .eq('liga_id', ligaId)
  if (errUsuarios) return NextResponse.json({ error: errUsuarios.message }, { status: 500 })

  // 2. Borrar la liga
  const { error: errLiga } = await supabase
    .from('ligas')
    .delete()
    .eq('id', ligaId)
  if (errLiga) return NextResponse.json({ error: errLiga.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-admin-token')
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: ligas, error } = await supabase
    .from('ligas')
    .select(`
      id,
      nombre_liga,
      codigo_invitacion,
      tipo,
      created_at,
      pote_virtual,
      cierre_inscripcion,
      usuarios (
        id,
        nombre,
        fichas,
        racha,
        pin,
        bono_usado,
        bloqueado
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const resultado = (ligas ?? []).map((liga) => ({
    id: liga.id,
    nombre_liga: liga.nombre_liga,
    codigo_invitacion: liga.codigo_invitacion,
    tipo: (liga.tipo as string) ?? 'vip',
    created_at: liga.created_at,
    pote_virtual: liga.pote_virtual ?? 0,
    cierre_inscripcion: liga.cierre_inscripcion ?? null,
    miembros: (liga.usuarios as Array<{
      id: string; nombre: string; fichas: number; racha: number; pin: string | null; bono_usado: boolean; bloqueado: boolean
    }>).map((u) => ({
      id: u.id,
      nombre: u.nombre,
      fichas: u.fichas,
      racha: u.racha,
      tienePin: u.pin !== null,
      bono_usado: u.bono_usado,
      bloqueado: u.bloqueado ?? false,
    })).sort((a, b) => b.fichas - a.fichas),
  }))

  return NextResponse.json(resultado)
}
