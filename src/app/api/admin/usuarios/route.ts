import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

/**
 * Deletes a single participant (for testing).
 * Their predicciones e historial_fichas are removed via ON DELETE CASCADE.
 *
 * DELETE /api/admin/usuarios  { token, usuarioId }
 */
export async function DELETE(req: NextRequest) {
  const { token, usuarioId } = await req.json()

  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!usuarioId) return NextResponse.json({ error: 'usuarioId requerido' }, { status: 400 })

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('usuarios')
    .delete()
    .eq('id', usuarioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
