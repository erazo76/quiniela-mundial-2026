'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/context/SessionContext'

export default function UnirmePage() {
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useSession()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/unirse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreUsuario: nombre, codigoInvitacion: codigo }),
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
      })

      router.push('/lobby?onboarding=1')
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col px-6 py-10">
      <Link href="/" className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-10 w-fit">
        ← Volver
      </Link>

      <div className="flex flex-col gap-8 max-w-sm w-full mx-auto">
        <div>
          <p className="text-green-400 text-sm font-semibold uppercase tracking-wider mb-1">Ingresar a mi liga</p>
          <h1 className="text-3xl font-black uppercase text-white">¿Cuál es tu liga?</h1>
          <p className="text-slate-400 text-sm mt-2">
            Ingresa tu nombre y el código de tu liga. Si ya participas, tu sesión se recupera automáticamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Tu nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Gustavo"
              maxLength={50}
              required
              className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500 transition-colors text-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Código de invitación
            </label>
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: AB12CD"
              maxLength={6}
              required
              className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500 transition-colors text-base tracking-widest font-bold uppercase"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !nombre.trim() || codigo.trim().length < 6}
            className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg uppercase tracking-wider rounded-2xl transition-all mt-2"
          >
            {loading ? 'Uniéndome...' : 'Unirme'}
          </button>
        </form>
      </div>
    </main>
  )
}
