'use client'
import { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/context/SessionContext'
import { getOnboardingVisto } from '@/lib/session'
import { avatarSrc, getAvatarIndex } from '@/lib/avatar'
import { WcStripe } from '@/components/WcStripe'
import { Onboarding } from '@/components/onboarding/Onboarding'
import { PartidosTab } from '@/components/partidos/PartidosTab'
import { RankingTab } from '@/components/ranking/RankingTab'
import { PerfilTab } from '@/components/perfil/PerfilTab'
import { TableroTab } from '@/components/tablero/TableroTab'

type Tab = 'partidos' | 'tablero' | 'ranking' | 'perfil'

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const cls = active ? 'opacity-100' : 'opacity-40'
  if (id === 'partidos') {
    return (
      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${cls}`} fill="currentColor">
        <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a1 1 0 110 2 1 1 0 010-2zm0 12a1 1 0 110-2 1 1 0 010 2zm5-5H7a1 1 0 010-2h10a1 1 0 010 2z"/>
      </svg>
    )
  }
  if (id === 'tablero') {
    return (
      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${cls}`} fill="currentColor">
        <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/>
      </svg>
    )
  }
  if (id === 'ranking') {
    return (
      <Image src="/ui/trophy.png" alt="Ranking" width={20} height={20} className={cls} />
    )
  }
  // perfil
  return (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${cls}`} fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  )
}

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

      {/* Franja FIFA 2026 en la parte superior */}
      <WcStripe height={3} />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
            <Image
              src={avatarSrc(getAvatarIndex(session.usuarioId, session.nombre))}
              alt={session.nombre}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none truncate">{session.ligaNombre}</p>
            <h2 className="text-sm font-bold text-white leading-tight truncate">{session.nombre}</h2>
          </div>
        </div>
        <div className="shrink-0 px-2">
          <Image src="/ui/copa.png" alt="Copa del Mundo 2026" width={32} height={32} unoptimized />
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Image src="/ui/coin.png" alt="fichas" width={16} height={16} className="opacity-90" />
            <span className="text-yellow-400 font-black text-base leading-none">{fichas.toLocaleString()}</span>
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

      {/* Contenido */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'partidos' && (
          <PartidosTab
            usuarioId={session.usuarioId}
            fichas={fichas}
            onFichasChange={setFichas}
          />
        )}
        {activeTab === 'tablero' && <TableroTab />}
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
      <nav className="border-t border-slate-800 flex shrink-0 bg-slate-950/80 backdrop-blur-md">
        {(['partidos', 'tablero', 'ranking', 'perfil'] as Tab[]).map((id) => {
          const labels: Record<Tab, string> = { partidos: 'Partidos', tablero: 'Tablero', ranking: 'Ranking', perfil: 'Perfil' }
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive ? 'text-white' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              <NavIcon id={id} active={isActive} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{labels[id]}</span>
            </button>
          )
        })}
      </nav>

      {/* Franja en la parte inferior */}
      <WcStripe height={3} />
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
