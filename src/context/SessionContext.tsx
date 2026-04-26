'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Session, getSession, saveSession, clearSession } from '@/lib/session'

interface SessionContextType {
  session: Session | null
  loading: boolean
  login: (session: Session) => void
  logout: () => void
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
  login: () => {},
  logout: () => {},
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSession(getSession())
    setLoading(false)
  }, [])

  const login = useCallback((s: Session) => {
    saveSession(s)
    setSession(s)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  return (
    <SessionContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
