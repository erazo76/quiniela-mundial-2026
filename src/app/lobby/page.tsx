'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/context/SessionContext'
import { getOnboardingVisto } from '@/lib/session'
import { Onboarding } from '@/components/onboarding/Onboarding'
import { PartidosTab } from '@/components/partidos/PartidosTab'
import { RankingTab } from '@/components/ranking/RankingTab'
import { PerfilTab } from '@/components/perfil/PerfilTab'

type Tab = 'partidos' | 'ranking' | 'perfil'

const NAV = [
  { id: 'partidos' as Tab, label: 'Partidos', icon: '📅' },
  { id: 'ranking' as Tab, label: 'Ranking', icon: '🏆' },
  { id: 'perfil' as Tab, label: 'Perfil', icon: '👤' },
]

function LobbyContent() {
  const { session, loading, logout } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('partidos')
  const [fichas, setFichas] = useState<number>(1000)

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
      // Cargar fichas reales desde DB
      fetch(`/api/usuario?id=${session.usuarioId}`)
        .then((r) => r.json())
        .then((data) => { if (data?.fichas != null) setFichas(data.fichas) })
        .catch(() => {})
    }
  }, [session, loading, router, searchParams])

  if (loading || !session) return null

  return (
    <main className="min-h-screen flex flex-col overflow-hidden max-h-screen">
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Liga</p>
          <h2 className="text-base font-bold text-white">{session.ligaNombre}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 uppercase tracking-widest">Fichas</span>
            <span className="text-yellow-400 font-black text-lg leading-none">{fichas.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white text-sm font-bold transition-colors"
            title="Ver tutorial"
          >
            ?
          </button>
        </div>
      </header>

      {/* Subheader */}
      <div className="px-5 py-2 border-b border-slate-800/50 shrink-0">
        <p className="text-sm text-slate-400">
          Hola, <span className="text-white font-semibold">{session.nombre}</span>
        </p>
      </div>

      {/* Contenido del tab activo */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'partidos' && (
          <PartidosTab
            usuarioId={session.usuarioId}
            fichas={fichas}
            onFichasChange={setFichas}
          />
        )}
        {activeTab === 'ranking' && (
          <RankingTab ligaId={session.ligaId} usuarioId={session.usuarioId} />
        )}
        {activeTab === 'perfil' && (
          <PerfilTab
            session={session}
            fichas={fichas}
            onLogout={() => { logout(); router.push('/') }}
            onVerTutorial={() => setShowOnboarding(true)}
          />
        )}
      </div>

      {/* Bottom nav */}
      <nav className="border-t border-slate-800 flex shrink-0">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === item.id
                ? 'text-green-400'
                : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
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
