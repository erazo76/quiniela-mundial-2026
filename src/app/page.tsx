'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/context/SessionContext'

const EASE_OUT = 'cubic-bezier(0.22,1,0.36,1)'

// 'left'  = la nariz apunta a la izquierda del viewer (el ojo derecho es más visible)
// 'right' = la nariz apunta a la derecha del viewer (el ojo izquierdo es más visible)
// 'center' = frontal, sin orientación marcada
type FacingDir = 'left' | 'right' | 'center'

const BANNERS: Array<{ name: string; facing: FacingDir }> = [
  { name: 'messi',          facing: 'left'   },
  { name: 'mbappe',         facing: 'center' },
  { name: 'vinicius',       facing: 'right'  },
  { name: 'ronaldo',        facing: 'center' },
  { name: 'lewandowski',    facing: 'center' },
  { name: 'roberto_carlos', facing: 'center' },
  { name: 'rodri',          facing: 'center' },
  { name: 'courtois',       facing: 'right'  },
  { name: 'van_dijk',       facing: 'right'  },
  { name: 'zidane',         facing: 'left'   },
  { name: 'zlatan',         facing: 'right'  },
  { name: 'valverde',       facing: 'left'   },
]

function pickTwo() {
  const shuffled = [...BANNERS].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1]] as const
}

function BannersBackground({
  left, right,
}: {
  left:  { name: string; facing: FacingDir }
  right: { name: string; facing: FacingDir }
}) {
  // Lado izquierdo debe mirar hacia la DERECHA (hacia el centro).
  // Necesita flip solo si la imagen mira naturalmente hacia la izquierda.
  const leftNeedsFlip  = left.facing  === 'left'
  // Lado derecho debe mirar hacia la IZQUIERDA (hacia el centro).
  // Necesita flip solo si la imagen mira naturalmente hacia la derecha.
  const rightNeedsFlip = right.facing === 'right'

  // fill-mode backwards aplica el keyframe 0% durante el delay, evitando el salto al iniciar
  const leftAnim  = `${leftNeedsFlip  ? 'breatheFlip' : 'breatheNoFlip'} 5s ease-in-out 3.3s infinite normal backwards`
  const rightAnim = `${rightNeedsFlip ? 'breatheFlip' : 'breatheNoFlip'} 6s ease-in-out 3.6s infinite normal backwards`

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">

      {/* ── Capa 1: fondo con respiro lento ── */}
      <div
        className="absolute inset-0"
        style={{ animation: `bgPulse 12s ease-in-out infinite` }}
      >
        <Image
          src="/ui/background2.jpg"
          alt=""
          fill
          className="object-cover"
          unoptimized
          priority
        />
      </div>

      {/* Jugador izquierda — orientado para mirar hacia la derecha (centro) */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: '115vh',
          height: '115vh',
          animation: `peekLeft 3s ${EASE_OUT} 0.3s both`,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            animation: leftAnim,
            mixBlendMode: 'multiply',
          }}
        >
          <Image src={`/banners/${left.name}.png`} alt="" fill className="object-contain" unoptimized />
        </div>
      </div>

      {/* Jugador derecha — orientado para mirar hacia la izquierda (centro) */}
      <div
        className="absolute"
        style={{
          right: 0,
          top: 0,
          width: '115vh',
          height: '115vh',
          animation: `peekRight 3s ${EASE_OUT} 0.6s both`,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            animation: rightAnim,
            mixBlendMode: 'multiply',
          }}
        >
          <Image src={`/banners/${right.name}.png`} alt="" fill className="object-contain" unoptimized />
        </div>
      </div>

      {/* ── Capa 3: overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(2,6,23,0.35) 0%, rgba(2,6,23,0.75) 100%)',
        }}
      />
    </div>
  )
}

export default function WelcomePage() {
  const { session, loading } = useSession()
  const router = useRouter()
  const [banners] = useState(() => pickTwo())

  useEffect(() => {
    if (!loading && session) router.replace('/lobby')
  }, [session, loading, router])

  if (loading) return null

  return (
    <main className="min-h-screen flex flex-col items-center justify-between px-6 py-12 relative overflow-hidden">
      <BannersBackground left={banners[0]} right={banners[1]} />

      <div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-sm w-full mt-16">

        {/* Copa con latido */}
        <div style={{ animation: 'copaPulse 3s ease-in-out infinite' }}>
          <Image
            src="/ui/copa.png"
            alt="Copa del Mundo"
            width={165}
            height={165}
            className="select-none"
            unoptimized
          />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black uppercase tracking-tight leading-none text-white drop-shadow-lg">
            Quiniela
            <span className="block text-green-400">Mundial 2026</span>
          </h1>
          <p className="text-slate-300 text-base leading-relaxed drop-shadow">
            Predice los partidos, apuesta fichas<br />y gana el pote con tu grupo
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/unirme"
            className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-95 text-black font-bold text-lg uppercase tracking-wider rounded-2xl transition-all shadow-lg"
          >
            Ingresar a mi liga
          </Link>
          <Link
            href="/crear"
            className="w-full py-4 bg-black/40 hover:bg-black/60 active:scale-95 text-white font-bold text-lg uppercase tracking-wider rounded-2xl border border-white/20 hover:border-white/40 transition-all backdrop-blur-sm"
          >
            Crear una liga nueva
          </Link>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3">
        <p className="text-xs text-slate-500 text-center max-w-xs drop-shadow">
          App recreativa entre amigos. Sin dinero real dentro de la plataforma.
        </p>
        <Link href="/admin" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
          Acceso admin
        </Link>
      </div>
    </main>
  )
}
