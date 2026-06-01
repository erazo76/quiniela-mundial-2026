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
  const icons: Record<Tab, { src: string; invert?: boolean }> = {
    partidos: { src: '/ui/icon-whistle.png' },
    tablero:  { src: '/ui/icon-tablero.png' },
    ranking:  { src: '/ui/icon-trophy-nav.png' },
    perfil:   { src: '/ui/icon-profile.png',    invert: true },
  }
  const { src, invert } = icons[id]
  return (
    <Image
      src={src}
      alt={id}
      width={24}
      height={24}
      className={cls}
      style={invert ? { filter: 'brightness(0) invert(1)' } : undefined}
      unoptimized
    />
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

  // Refresca fichas cada 30s y al volver a la pestaña (sin polling intensivo)
  useEffect(() => {
    if (!session) return
    const refresh = () => {
      if (document.hidden) return
      fetch(`/api/usuario?id=${session.usuarioId}`)
        .then((r) => r.json())
        .then((data) => { if (data?.fichas != null) setFichas(data.fichas) })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', refresh)
    const id = setInterval(refresh, 30_000)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      clearInterval(id)
    }
  }, [session])

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
          <Image src="/ui/icon-soccer.png" alt="Copa del Mundo 2026" width={36} height={36} unoptimized />
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Image src="/ui/icon-coins.png" alt="fichas" width={20} height={20} className="opacity-90" unoptimized />
            <span className="text-yellow-400 font-black text-base leading-none">{fichas.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
            title="Ver tutorial"
          >
            <Image src="/ui/questionIcon.png" alt="?" width={18} height={18} unoptimized style={{ filter: 'brightness(0) invert(1)' }} />
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
