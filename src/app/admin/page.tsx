'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const ADMIN_TOKEN_KEY = 'qm2026_admin_token'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (localStorage.getItem(ADMIN_TOKEN_KEY)) {
      router.replace('/admin/partidos')
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Contraseña incorrecta')
        return
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      router.push('/admin/partidos')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col px-6 py-10">
      <Link href="/" className="mb-10 w-fit opacity-80 hover:opacity-100 transition-opacity active:scale-95">
        <Image src="/ui/icon-back.png" alt="Volver" width={36} height={36} unoptimized />
      </Link>

      <div className="flex flex-col gap-8 max-w-sm w-full mx-auto mt-8">
        {/* Encabezado */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/ui/icon-lock.png" alt="Admin" width={72} height={72} unoptimized />
          <div>
            <p className="text-green-400 text-sm font-semibold uppercase tracking-wider mb-1">
              Panel de administración
            </p>
            <h1 className="text-3xl font-black uppercase text-white">Quiniela 2026</h1>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={mostrar ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa la contraseña"
                required
                autoFocus
                className="w-full px-4 py-3.5 pr-12 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500 transition-colors text-base"
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
              >
                {mostrar ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg uppercase tracking-wider rounded-2xl transition-all mt-2"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}
