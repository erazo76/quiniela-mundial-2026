import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminToken } from '@/lib/admin-auth'

const DISTRIBUCION = [
  { label: '1er lugar', pct: 0.60 },
  { label: '2do lugar', pct: 0.25 },
  { label: '3er lugar', pct: 0.15 },
]

export async function POST(req: NextRequest) {
  const { token, ligaId } = await req.json()
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!ligaId) return NextResponse.json({ error: 'ligaId requerido' }, { status: 400 })

  const supabase = createAdminClient()

  // Obtener pote y ranking de la liga
  const [{ data: liga }, { data: usuarios }] = await Promise.all([
    supabase.from('ligas').select('pote_virtual, nombre_liga').eq('id', ligaId).single(),
    supabase.from('usuarios').select('id, nombre, fichas').eq('liga_id', ligaId).order('fichas', { ascending: false }),
  ])

  if (!liga) return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 })

  const pote = liga.pote_virtual ?? 0
  if (pote === 0) return NextResponse.json({ error: 'El pote está en 0, no hay nada que distribuir' }, { status: 400 })

  const premiados = usuarios?.slice(0, 3) ?? []
  if (!premiados.length) return NextResponse.json({ error: 'No hay participantes' }, { status: 400 })

  const premios = DISTRIBUCION.slice(0, premiados.length).map((d, i) => ({
    usuario: premiados[i],
    pct: d.pct,
    label: d.label,
    monto: Math.floor(pote * d.pct),
  }))

  // Ajustar por redondeo: el resto va al primero
  const totalDistribuido = premios.reduce((s, p) => s + p.monto, 0)
  if (premios.length > 0) premios[0].monto += pote - totalDistribuido

  // Actualizar fichas de cada premiado
  const historialEntries: Array<{ usuario_id: string; tipo: string; cantidad: number; descripcion: string }> = []
  for (const p of premios) {
    const { error } = await supabase
      .from('usuarios')
      .update({ fichas: p.usuario.fichas + p.monto })
      .eq('id', p.usuario.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    historialEntries.push({
      usuario_id: p.usuario.id,
      tipo: 'premio_pote',
      cantidad: p.monto,
      descripcion: `${p.label} · Liga "${liga.nombre_liga}" · Pote ${pote}`,
    })
  }

  // Registrar en historial y resetear pote
  await Promise.all([
    supabase.from('historial_fichas').insert(historialEntries),
    supabase.from('ligas').update({ pote_virtual: 0 }).eq('id', ligaId),
  ])

  return NextResponse.json({
    ok: true,
    pote,
    distribucion: premios.map((p) => ({
      nombre: p.usuario.nombre,
      label: p.label,
      monto: p.monto,
    })),
  })
}
