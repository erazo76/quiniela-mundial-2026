'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/context/SessionContext'
import { getOnboardingVisto } from '@/lib/session'
import { Onboarding } from '@/components/onboarding/Onboarding'
import { Suspense } from 'react'

function LobbyContent() {
  const { session, loading, logout } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/')
      return
    }
    if (!loading && session) {
      const forzar = searchParams.get('onboarding') === '1'
      if (forzar || !getOnboardingVisto()) {
        setShowOnboarding(true)
      }
    }
  }, [session, loading, router, searchParams])

  if (loading || !session) return null

  return (
    <main className="min-h-screen flex flex-col">
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Liga</p>
          <h2 className="text-base font-bold text-white">{session.ligaNombre}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOnboarding(true)}
            className="text-slate-500 hover:text-white text-lg transition-colors"
            title="Ver tutorial"
          >
            ?
          </button>
          <button
            onClick={() => { logout(); router.push('/') }}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl">
            ⚽
          </div>
          <div>
            <p className="text-slate-400 text-sm">Hola,</p>
            <h1 className="text-3xl font-black uppercase text-white">{session.nombre}</h1>
          </div>
        </div>

        {/* Código de liga */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 flex flex-col items-center gap-1">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Código de invitación</p>
          <p className="text-3xl font-black tracking-widest text-green-400">{session.codigoInvitacion}</p>
          <p className="text-xs text-slate-600">Compartilo con tus amigos</p>
        </div>

        {/* Fichas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 flex flex-col items-center gap-1 w-full max-w-xs">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Tus fichas</p>
          <p className="text-4xl font-black text-yellow-400">1000</p>
        </div>

        <p className="text-slate-600 text-sm">
          Los partidos estarán disponibles próximamente
        </p>
      </div>

      {/* Bottom nav placeholder */}
      <nav className="border-t border-slate-800 flex">
        {[
          { label: 'Partidos', emoji: '📅' },
          { label: 'Ranking', emoji: '🏆' },
          { label: 'Perfil', emoji: '👤' },
        ].map(item => (
          <button
            key={item.label}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-slate-600"
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

export default function LobbyPage() {
  return (
    <Suspense>
      <LobbyContent />
    </Suspense>
  )
}
