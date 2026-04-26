import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

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
      created_at,
      usuarios (
        id,
        nombre,
        fichas,
        racha,
        pin,
        bono_usado
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const resultado = (ligas ?? []).map((liga) => ({
    id: liga.id,
    nombre_liga: liga.nombre_liga,
    codigo_invitacion: liga.codigo_invitacion,
    created_at: liga.created_at,
    miembros: (liga.usuarios as Array<{
      id: string; nombre: string; fichas: number; racha: number; pin: string | null; bono_usado: boolean
    }>).map((u) => ({
      id: u.id,
      nombre: u.nombre,
      fichas: u.fichas,
      racha: u.racha,
      tienePin: u.pin !== null,
      bono_usado: u.bono_usado,
    })).sort((a, b) => b.fichas - a.fichas),
  }))

  return NextResponse.json(resultado)
}
