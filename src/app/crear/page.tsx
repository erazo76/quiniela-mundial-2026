'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from '@/context/SessionContext'

function PinBoxes({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div
      className="flex gap-3 justify-center cursor-text"
      onClick={() => ref.current?.focus()}
    >
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        className="sr-only"
        aria-label="PIN de 4 dígitos"
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-16 h-16 flex items-center justify-center rounded-2xl border-2 transition-all duration-150 ${
            value.length === i
              ? 'border-green-500 bg-slate-800 shadow-lg shadow-green-500/20'
              : value[i]
              ? 'border-slate-500 bg-slate-800'
              : 'border-slate-700 bg-slate-900'
          }`}
        >
          {value[i] && <div className="w-3 h-3 rounded-full bg-white" />}
        </div>
      ))}
    </div>
  )
}

export default function CrearLigaPage() {
  const [nombre, setNombre] = useState('')
  const [nombreLiga, setNombreLiga] = useState('')
  const [pin, setPin] = useState('')
  const [tipo, setTipo] = useState<'vip' | 'junior'>('vip')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useSession()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) { setError('El PIN debe tener 4 dígitos'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/ligas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreUsuario: nombre, nombreLiga, pin, tipo }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error desconocido')
        return
      }

      login({
        usuarioId: data.usuario.id,
        nombre: data.usuario.nombre,
        ligaId: data.liga.id,
        ligaNombre: data.liga.nombre_liga,
        codigoInvitacion: data.liga.codigo_invitacion,
        ligaTipo: data.liga.tipo ?? 'vip',
      })

      router.push('/lobby?onboarding=1')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col px-6 py-10">
      <Link href="/" className="mb-10 w-fit opacity-80 hover:opacity-100 active:scale-95 transition-opacity">
        <Image src="/ui/icon-back.png" alt="Volver" width={36} height={36} unoptimized style={{ filter: 'brightness(0) invert(1)' }} />
      </Link>

      <div className="flex flex-col gap-8 max-w-sm w-full mx-auto">
        <div>
          <p className="text-green-400 text-sm font-semibold uppercase tracking-wider mb-1">
            Nueva liga
          </p>
          <h1 className="text-3xl font-black uppercase text-white">Crear liga</h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Recibirás un código de 6 letras para compartir con tus amigos. Tu PIN protege tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Nombre de la liga
            </label>
            <input
              type="text"
              value={nombreLiga}
              onChange={(e) => setNombreLiga(e.target.value)}
              placeholder="Ej: Los Cracks del Mundial"
              maxLength={100}
              required
              autoFocus
              className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500 transition-colors text-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Tu nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Gustavo"
              maxLength={50}
              required
              className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500 transition-colors text-base"
            />
          </div>

          {/* Tipo de liga */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Modalidad de liga
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([['vip', 'VIP', 'Fichas y apuestas, racha de oro, bono de rescate'], ['junior', 'JUNIOR', 'Puntos por aciertos (3/2/0), sin apuestas, ranking simple']] as const).map(([val, label, desc]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTipo(val)}
                  className={`flex flex-col gap-1 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                    tipo === val
                      ? val === 'vip'
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <span className={`text-sm font-black ${tipo === val ? (val === 'vip' ? 'text-yellow-400' : 'text-blue-400') : 'text-white'}`}>
                    {label}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
              Tu PIN (4 dígitos)
            </label>
            <PinBoxes value={pin} onChange={setPin} />
            <p className="text-xs text-slate-600 text-center">
              Toca los cuadros para ingresar · Guárdalo bien, lo necesitarás cada vez que entres
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !nombre.trim() || !nombreLiga.trim() || pin.length < 4}
            className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg uppercase tracking-wider rounded-2xl transition-all mt-2"
          >
            {loading ? 'Creando...' : 'Crear liga'}
          </button>
        </form>
      </div>
    </main>
  )
}
