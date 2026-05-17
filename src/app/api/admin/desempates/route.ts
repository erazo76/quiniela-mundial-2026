import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const { token, items } = await req.json()
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items requerido' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('grupo_desempates')
    .upsert(items, { onConflict: 'grupo,equipo' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { token, grupo, equipo } = await req.json()
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const query = supabase.from('grupo_desempates').delete().eq('grupo', grupo)
  const { error } = equipo ? await query.eq('equipo', equipo) : await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
