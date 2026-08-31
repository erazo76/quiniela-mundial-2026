import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Keep-alive: el plan free de Supabase pausa el proyecto tras varios días sin
// actividad. Un cron diario pega aquí para mantenerlo despierto ahora que el
// torneo terminó y la sync de resultados ya no corre.
// Lectura mínima: solo cuenta filas (head: true), no transfiere datos.
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminClient()

  const { count, error } = await supabase
    .from('partidos')
    .select('id', { count: 'exact', head: true })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, partidos: count, ts: new Date().toISOString() })
}
