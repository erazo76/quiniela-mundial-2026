'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/context/SessionContext'

export default function WelcomePage() {
  const { session, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!loading && session) router.replace('/lobby')
  }, [session, loading, router])

  if (loading) return null

  return (
    <main className="min-h-screen flex flex-col items-center justify-between px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-green-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center gap-10 max-w-sm w-full mt-16">
        <div className="text-8xl drop-shadow-lg select-none">⚽</div>

        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-black uppercase tracking-tight leading-none">
            Quiniela
            <span className="block text-green-400">Mundial 2026</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Predice los partidos, apuesta fichas<br />y gana el pote con tu grupo
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/crear"
            className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-95 text-black font-bold text-lg uppercase tracking-wider rounded-2xl transition-all"
          >
            Crear liga
          </Link>
          <Link
            href="/unirme"
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg uppercase tracking-wider rounded-2xl border border-slate-700 transition-all"
          >
            Unirme a una liga
          </Link>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3">
        <p className="text-xs text-slate-600 text-center max-w-xs">
          App recreativa entre amigos. Sin dinero real dentro de la plataforma.
        </p>
        <Link href="/admin" className="text-xs text-slate-700 hover:text-slate-500 transition-colors">
          Acceso admin
        </Link>
      </div>
    </main>
  )
}
