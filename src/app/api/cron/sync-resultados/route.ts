import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncResultadosFootballData } from '@/lib/sync-football-data'

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret')
  const authHeader = req.headers.get('authorization')
  const expectedBearer = `Bearer ${process.env.CRON_SECRET}`
  const authorized = cronSecret === process.env.CRON_SECRET || authHeader === expectedBearer
  if (!authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  try {
    const result = await syncResultadosFootballData(supabase)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
