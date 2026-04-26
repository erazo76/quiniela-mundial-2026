'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Partido, Prediccion } from '@/types'

interface Props {
  partido: Partido
  prediccionExistente: Prediccion | null
  fichas: number
  usuarioId: string
  onClose: () => void
  onGuardada: (fichasNuevas: number, prediccion: Prediccion) => void
}

function Bandera({ src, nombre }: { src: string | null; nombre: string }) {
  if (!src) {
    return (
      <div className="w-12 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-slate-500 text-sm">
        ?
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={nombre}
      width={48}
      height={36}
      className="rounded-lg object-cover w-12 h-9"
      unoptimized
    />
  )
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 9,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-10 rounded-full bg-slate-800 text-white text-xl font-bold flex items-center justify-center active:scale-95 transition-transform"
      >
        −
      </button>
      <span className="text-3xl font-black text-white w-8 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-10 h-10 rounded-full bg-slate-800 text-white text-xl font-bold flex items-center justify-center active:scale-95 transition-transform"
      >
        +
      </button>
    </div>
  )
}

export function ModalPrediccion({ partido, prediccionExistente, fichas, usuarioId, onClose, onGuardada }: Props) {
  const [golesLocal, setGolesLocal] = useState(prediccionExistente?.goles_local ?? 1)
  const [golesVisitante, setGolesVisitante] = useState(prediccionExistente?.goles_visitante ?? 0)
  const maxApuesta = Math.max(10, Math.floor(fichas * 0.3))
  const [fichasApostadas, setFichasApostadas] = useState(
    prediccionExistente?.fichas_apostadas ?? Math.min(50, maxApuesta)
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esEmpate = golesLocal === golesVisitante
  const gananciaExacto = fichasApostadas * 3
  const gananciaGanador = Math.floor(fichasApostadas * 1.5)

  async function handleGuardar() {
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch('/api/predicciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioId,
          partido_id: partido.id,
          goles_local: golesLocal,
          goles_visitante: golesVisitante,
          fichas_apostadas: fichasApostadas,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al guardar la prediccion')
        return
      }
      onGuardada(data.fichas, {
        id: prediccionExistente?.id ?? '',
        usuario_id: usuarioId,
        partido_id: partido.id,
        goles_local: golesLocal,
        goles_visitante: golesVisitante,
        fichas_apostadas: fichasApostadas,
        ganancia_fichas: 0,
        tipo_acierto: null,
        acertado: false,
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Tu predicción</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl transition-colors">×</button>
        </div>

        {/* Equipos */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-2 flex-1">
            <Bandera src={partido.bandera_local} nombre={partido.equipo_local} />
            <span className="text-xs text-slate-300 text-center font-semibold leading-tight">
              {partido.equipo_local}
            </span>
          </div>

          <div className="text-slate-600 text-sm font-bold px-4">VS</div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <Bandera src={partido.bandera_visitante} nombre={partido.equipo_visitante} />
            <span className="text-xs text-slate-300 text-center font-semibold leading-tight">
              {partido.equipo_visitante}
            </span>
          </div>
        </div>

        {/* Score steppers */}
        <div className="flex items-center justify-center gap-6">
          <Stepper value={golesLocal} onChange={setGolesLocal} />
          <span className="text-slate-600 font-bold text-xl">-</span>
          <Stepper value={golesVisitante} onChange={setGolesVisitante} />
        </div>

        {/* Fichas */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Fichas a apostar</span>
            <span className="text-yellow-400 font-bold text-sm">{fichasApostadas} / {fichas} disponibles</span>
          </div>
          <input
            type="range"
            min={10}
            max={maxApuesta}
            step={10}
            value={fichasApostadas}
            onChange={(e) => setFichasApostadas(Number(e.target.value))}
            className="w-full accent-green-400"
          />
          <div className="flex justify-between text-xs text-slate-600">
            <span>Min: 10</span>
            <span>Max: {maxApuesta} (30%)</span>
          </div>
        </div>

        {/* Ganancias potenciales */}
        <div className="bg-slate-900 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
            Ganancias potenciales
          </p>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">
              Resultado exacto {esEmpate ? '(empate)' : ''}
            </span>
            <span className="text-green-400 font-bold text-sm">+{gananciaExacto} fichas</span>
          </div>
          {!esEmpate && (
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Ganador correcto</span>
              <span className="text-yellow-400 font-bold text-sm">+{gananciaGanador} fichas</span>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {/* Confirmar */}
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-black uppercase tracking-wide py-4 rounded-2xl transition-colors"
        >
          {guardando ? 'Guardando...' : prediccionExistente ? 'Actualizar predicción' : 'Confirmar predicción'}
        </button>
      </div>
    </div>
  )
}
