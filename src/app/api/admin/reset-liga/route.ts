import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

/**
 * Resets ONLY the predictions and scores of a single league (for testing):
 * - predicciones: deleted for that league's members
 * - historial_fichas: deleted for that league's members
 * - usuarios: fichas → 1000 (vip) / 0 (junior), racha → 0, bono_usado → false
 * - ligas: pote_virtual → 0
 *
 * Matches (partidos) are left untouched.
 *
 * POST /api/admin/reset-liga  { token, ligaId }
 */
export async function POST(req: NextRequest) {
  const { token, ligaId } = await req.json()

  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!ligaId) return NextResponse.json({ error: 'ligaId requerido' }, { status: 400 })

  const supabase = createAdminClient()

  // ─── 1. Tipo de liga y sus miembros ────────────────────────────────────────
  const { data: liga, error: errLiga } = await supabase
    .from('ligas')
    .select('id, tipo')
    .eq('id', ligaId)
    .single()
  if (errLiga || !liga) return NextResponse.json({ error: errLiga?.message ?? 'Liga no encontrada' }, { status: 404 })

  const { data: usuarios, error: errUsuarios } = await supabase
    .from('usuarios')
    .select('id, nombre, liga_id')
    .eq('liga_id', ligaId)
  if (errUsuarios) return NextResponse.json({ error: errUsuarios.message }, { status: 500 })

  const ids = (usuarios ?? []).map((u) => u.id)
  const fichasIniciales = liga.tipo === 'junior' ? 0 : 1000

  // ─── 2. Borrar predicciones e historial de los miembros ────────────────────
  if (ids.length) {
    await supabase.from('predicciones').delete().in('usuario_id', ids)
    await supabase.from('historial_fichas').delete().in('usuario_id', ids)

    // ─── 3. Restaurar usuarios a estado inicial ──────────────────────────────
    await supabase.from('usuarios').upsert(
      (usuarios ?? []).map((u) => ({
        id: u.id,
        nombre: u.nombre,
        liga_id: u.liga_id,
        fichas: fichasIniciales,
        racha: 0,
        bono_usado: false,
      }))
    )
  }

  // ─── 4. Resetear pote de la liga ───────────────────────────────────────────
  await supabase.from('ligas').update({ pote_virtual: 0 }).eq('id', ligaId)

  return NextResponse.json({ ok: true })
}
