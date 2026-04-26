import { createAdminClient } from './supabase/admin'

export async function verifyAdminToken(token: string | null): Promise<boolean> {
  if (!token) return false
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('admin_sessions')
    .select('token')
    .eq('token', token)
    .maybeSingle()
  return !!data
}
