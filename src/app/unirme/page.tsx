'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from '@/context/SessionContext'

type Paso = 'codigo' | 'liga' | 'pin'

interface Miembro {
  id: string
  nombre: string
  tienePin: boolean
}

interface LigaInfo {
  id: string
  nombre_liga: string
  codigo_invitacion: string
}

function PinBoxes({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) setTimeout(() => ref.current?.focus(), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

function Progreso({ paso }: { paso: number }) {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i <= paso ? 'w-6 bg-green-500' : 'w-2 bg-slate-700'
          }`}
        />
      ))}
      <span className="text-xs text-slate-500 ml-1">{paso + 1} / 3</span>
    </div>
  )
}

export default function UnirmePage() {
  const [paso, setPaso] = useState<Paso>('codigo')
  const [codigo, setCodigo] = useState('')
  const [liga, setLiga] = useState<LigaInfo | null>(null)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [seleccionado, setSeleccionado] = useState<Miembro | null>(null)
  const [esNuevo, setEsNuevo] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [intentosFallidos, setIntentosFallidos] = useState(0)
  const { login } = useSession()
  const router = useRouter()

  const pasoNumero = paso === 'codigo' ? 0 : paso === 'liga' ? 1 : 2

  async function buscarLiga(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ligas/miembros?codigo=${codigo.trim().toUpperCase()}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Código no válido'); return }
      setLiga(data.liga)
      setMiembros(data.miembros)
      setPaso('liga')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function seleccionarMiembro(m: Miembro) {
    setSeleccionado(m)
    setEsNuevo(false)
    setPin('')
    setError('')
    setIntentosFallidos(0)
    setPaso('pin')
  }

  function irANuevo() {
    setSeleccionado(null)
    setEsNuevo(true)
    setNombreNuevo('')
    setPin('')
    setError('')
    setPaso('pin')
  }

  async function confirmarPin(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) return
    setLoading(true)
    setError('')
    try {
      const body = esNuevo
        ? { codigoInvitacion: codigo, nombreUsuario: nombreNuevo.trim(), pin }
        : { codigoInvitacion: codigo, usuarioId: seleccionado!.id, pin }

      const res = await fetch('/api/unirse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        if (!esNuevo) setIntentosFallidos((n) => n + 1)
        setError(data.error ?? 'Error al ingresar')
        setPin('')
        return
      }

      login({
        usuarioId: data.usuario.id,
        nombre: data.usuario.nombre,
        ligaId: data.liga.id,
        ligaNombre: data.liga.nombre_liga,
        codigoInvitacion: data.liga.codigo_invitacion,
      })
      router.push(esNuevo ? '/lobby?onboarding=1' : '/lobby')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function volverAtras() {
    setError('')
    setPin('')
    if (paso === 'pin') setPaso('liga')
    else if (paso === 'liga') setPaso('codigo')
    else router.push('/')
  }

  return (
    <main className="min-h-screen flex flex-col px-6 py-10">
      {/* Header con navegación y progreso */}
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={volverAtras}
          className="opacity-80 hover:opacity-100 active:scale-95 transition-opacity"
        >
          <Image src="/ui/icon-back.png" alt="Volver" width={36} height={36} unoptimized style={{ filter: 'brightness(0) invert(1)' }} />
        </button>
        <Progreso paso={pasoNumero} />
      </div>

      <div className="flex flex-col gap-8 max-w-sm w-full mx-auto">

        {/* ── PASO 1: CÓDIGO ── */}
        {paso === 'codigo' && (
          <>
            <div className="text-center">
              <Image src="/ui/icon-soccer.png" alt="Copa del Mundo" width={110} height={110} className="mb-4 drop-shadow-lg mx-auto block" unoptimized />
              <h1 className="text-3xl font-black uppercase text-white">¡Bienvenido!</h1>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Ingresa el código de 6 letras que te compartieron para unirte a tu liga.
              </p>
            </div>

            {/* Mini onboarding — explicación del juego */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                ¿Cómo funciona?
              </p>
              {[
                { img: '/ui/icon-star.png',    titulo: 'Predice',     desc: 'Elige el marcador exacto de cada partido' },
                { img: '/ui/icon-coins.png',  titulo: 'Gana fichas', desc: 'Exacto ×3 · Ganador ×1.5 · Fallo ×0' },
                { img: '/ui/icon-compete.png', titulo: 'Compite',     desc: 'El que más fichas tenga al final, gana' },
              ].map(({ img, titulo, desc }) => (
                <div key={titulo} className="flex items-start gap-3">
                  <Image src={img} alt={titulo} width={22} height={22} className="mt-0.5 shrink-0" unoptimized />
                  <div>
                    <p className="text-sm font-bold text-white">{titulo}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={buscarLiga} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Código de la liga
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="AB12CD"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full px-4 py-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500 transition-colors text-2xl tracking-[0.3em] font-black text-center uppercase"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 px-4 py-3 rounded-xl">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || codigo.trim().length < 6}
                className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg uppercase tracking-wider rounded-2xl transition-all"
              >
                {loading ? 'Buscando...' : 'Continuar →'}
              </button>
            </form>
          </>
        )}

        {/* ── PASO 2: SELECCIÓN ── */}
        {paso === 'liga' && liga && (
          <>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-black text-xs font-black">✓</span>
                <p className="text-green-400 text-sm font-semibold">Liga encontrada</p>
              </div>
              <h1 className="text-3xl font-black uppercase text-white">{liga.nombre_liga}</h1>
              <p className="text-slate-400 text-sm mt-2">
                {miembros.length > 0
                  ? 'Selecciona tu nombre para ingresar, o únete si es tu primera vez.'
                  : 'Sé el primero en unirte a esta liga.'}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {miembros.length > 0 && (
                <>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Miembros ({miembros.length})
                  </p>
                  {miembros.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => seleccionarMiembro(m)}
                      className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] border border-slate-700 hover:border-green-500/50 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-700 group-hover:bg-green-500/20 flex items-center justify-center text-sm font-black text-white transition-colors">
                          {m.nombre[0].toUpperCase()}
                        </div>
                        <span className="text-white font-semibold">{m.nombre}</span>
                      </div>
                      <span className="text-slate-500 group-hover:text-green-400 text-sm font-medium transition-colors">
                        Soy yo →
                      </span>
                    </button>
                  ))}

                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-600">o</span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                </>
              )}

              <button
                onClick={irANuevo}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700 hover:border-slate-600 text-white font-semibold rounded-xl transition-all text-sm"
              >
                + Soy nuevo en esta liga
              </button>
            </div>
          </>
        )}

        {/* ── PASO 3: PIN ── */}
        {paso === 'pin' && (
          <form onSubmit={confirmarPin} className="flex flex-col gap-6">
            {esNuevo ? (
              /* Nuevo usuario */
              <>
                <div>
                  <p className="text-green-400 text-sm font-semibold uppercase tracking-wider mb-1">
                    Primera vez en {liga?.nombre_liga}
                  </p>
                  <h1 className="text-3xl font-black uppercase text-white">Crea tu cuenta</h1>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                    Elige un nombre y un PIN de 4 dígitos. El PIN te identifica — sin él no podrás volver a entrar.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Tu nombre
                  </label>
                  <input
                    type="text"
                    value={nombreNuevo}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    placeholder="Ej: Gustavo"
                    maxLength={50}
                    required
                    autoFocus
                    className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500 transition-colors text-base"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                    Tu PIN (4 dígitos)
                  </label>
                  <PinBoxes value={pin} onChange={setPin} autoFocus={false} />
                  <p className="text-xs text-slate-600 text-center">
                    Toca los cuadros para ingresar tu PIN · Guárdalo, lo necesitarás cada vez
                  </p>
                </div>

                {/* Motivación */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Image src="/ui/coin.png" alt="fichas" width={28} height={28} unoptimized />
                  <p className="text-sm text-green-300 leading-snug">
                    Empiezas con <strong>500 fichas</strong> para apostar desde el primer partido
                  </p>
                </div>
              </>
            ) : (
              /* Usuario existente */
              <>
                <div>
                  <p className="text-green-400 text-sm font-semibold uppercase tracking-wider mb-1">
                    Ingresando como
                  </p>
                  <h1 className="text-3xl font-black uppercase text-white">
                    {seleccionado?.nombre}
                  </h1>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                    {seleccionado?.tienePin
                      ? 'Ingresa tu PIN de 4 dígitos para confirmar que eres tú.'
                      : 'Primera vez ingresando con el nuevo sistema — elige un PIN para proteger tu cuenta.'}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                    {seleccionado?.tienePin ? 'Tu PIN' : 'Elige tu PIN'}
                  </label>
                  <PinBoxes value={pin} onChange={setPin} autoFocus />
                  {intentosFallidos >= 3 && (
                    <p className="text-xs text-amber-400 text-center bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      ¿Olvidaste tu PIN? El admin de tu liga puede resetearlo.
                    </p>
                  )}
                </div>
              </>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 px-4 py-3 rounded-xl text-center">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || pin.length < 4 || (esNuevo && !nombreNuevo.trim())}
                className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg uppercase tracking-wider rounded-2xl transition-all"
              >
                {loading ? 'Verificando...' : esNuevo ? '¡Unirme!' : 'Ingresar'}
              </button>

              {!esNuevo && (
                <button
                  type="button"
                  onClick={() => { setPaso('liga'); setPin(''); setError('') }}
                  className="text-slate-500 hover:text-slate-300 text-sm text-center transition-colors py-1"
                >
                  No soy yo — ver la lista de nuevo
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
