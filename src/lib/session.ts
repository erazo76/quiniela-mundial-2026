export interface Session {
  usuarioId: string
  nombre: string
  ligaId: string
  ligaNombre: string
  codigoInvitacion: string
  ligaTipo: 'vip' | 'junior'
}

const KEY = 'qm2026_session'

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}

export function getOnboardingVisto(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('qm2026_onboarding') === '1'
}

export function marcarOnboardingVisto(): void {
  localStorage.setItem('qm2026_onboarding', '1')
}
