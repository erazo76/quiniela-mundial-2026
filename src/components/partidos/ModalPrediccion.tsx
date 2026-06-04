'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Partido, Prediccion } from '@/types'
import { playSound } from '@/lib/audio'
import { WcStripe } from '@/components/WcStripe'

interface InfoEquipo {
  nombre: string
  dato_freak_1: string | null
  dato_freak_2: string | null
  dato_freak_3: string | null
  figura_clave_nombre: string | null
  mejor_puesto_mundial: string | null
  participaciones: number | null
}

interface Props {
  partido: Partido
  prediccionExistente: Prediccion | null
  fichas: number
  ligaTipo: 'vip' | 'junior'
  usuarioId: string
  onClose: () => void
  onGuardada: (fichasNuevas: number, prediccion: Prediccion) => void
}

function BanderaConTooltip({
  src,
  nombre,
  info,
}: {
  src: string | null
  nombre: string
  info: InfoEquipo | undefined
}) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const datos = info
    ? ([info.dato_freak_1, info.dato_freak_2, info.dato_freak_3].filter(Boolean) as string[])
    : []

  function pickFact() {
    if (!datos.length) return null
    return datos[Math.floor(Math.random() * datos.length)]
  }

  function show() {
    const text = pickFact()
    if (!text || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top })
  }

  function hide() { setTooltip(null) }

  const img = src ? (
    <Image src={src} alt={nombre} width={48} height={36} className="rounded-lg object-cover w-12 h-9" unoptimized />
  ) : (
    <div className="w-12 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-slate-500 text-sm">?</div>
  )

  if (!datos.length) return img

  return (
    <>
      <div
        ref={ref}
        className="relative cursor-pointer"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={() => tooltip ? hide() : show()}
      >
        <div className="relative">
          {img}
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border border-slate-950 text-[7px] flex items-center justify-center font-black text-black leading-none">i</span>
        </div>
      </div>
      {tooltip && (
        <div
          className="fixed w-52 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-[11px] text-slate-200 leading-snug z-[200] shadow-xl pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </>
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


export function ModalPrediccion({ partido, prediccionExistente, fichas, ligaTipo, usuarioId, onClose, onGuardada }: Props) {
  const esJunior = ligaTipo === 'junior'
  const [golesLocal, setGolesLocal] = useState(prediccionExistente?.goles_local ?? 1)
  const [golesVisitante, setGolesVisitante] = useState(prediccionExistente?.goles_visitante ?? 0)
  const fichasEfectivas = fichas + (prediccionExistente?.fichas_apostadas ?? 0)
  // Tope del 30% aplica solo para nuevas apuestas o incrementos
  const maxApuesta = Math.max(10, Math.floor(fichasEfectivas * 0.3))
  // Al editar puedes bajar libremente; el slider llega hasta max(apuesta actual, tope 30%)
  const sliderMax = prediccionExistente
    ? Math.max(prediccionExistente.fichas_apostadas, maxApuesta)
    : maxApuesta
  const [fichasApostadas, setFichasApostadas] = useState(() => {
    const raw = prediccionExistente?.fichas_apostadas ?? Math.min(50, sliderMax)
    const snapped = Math.floor(Math.min(raw, sliderMax) / 10) * 10
    return Math.max(10, snapped)
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoEquipos, setInfoEquipos] = useState<Record<string, InfoEquipo> | null>(null)

  useEffect(() => {
    const local = encodeURIComponent(partido.equipo_local)
    const visitante = encodeURIComponent(partido.equipo_visitante)
    fetch(`/api/info-equipo?local=${local}&visitante=${visitante}`)
      .then((r) => r.json())
      .then(setInfoEquipos)
      .catch(() => {})
  }, [partido.equipo_local, partido.equipo_visitante])

  useEffect(() => {
    if (partido.estado !== 'finalizado' || !prediccionExistente) return
    if (prediccionExistente.tipo_acierto === 'exacto') {
      playSound('reveal.ogg', 0.4)
      setTimeout(() => playSound('winner.ogg', 0.6), 500)
    } else if (prediccionExistente.tipo_acierto === 'ganador') {
      playSound('reveal.ogg', 0.4)
      setTimeout(() => playSound('crowd_goal.ogg', 0.5), 400)
    } else if (prediccionExistente.tipo_acierto && !prediccionExistente.acertado) {
      playSound('disappointed.ogg', 0.4)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      playSound('coin.ogg', 0.5)
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
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92dvh]">
        <WcStripe height={3} />
        <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Tu predicción</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl transition-colors">×</button>
        </div>

        {/* Equipos */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-2 flex-1">
            <BanderaConTooltip
              src={partido.bandera_local}
              nombre={partido.equipo_local}
              info={infoEquipos?.[partido.equipo_local]}
            />
            <span className="text-xs text-slate-300 text-center font-semibold leading-tight">
              {partido.equipo_local}
            </span>
          </div>

          <div className="text-slate-600 text-sm font-bold px-4">VS</div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <BanderaConTooltip
              src={partido.bandera_visitante}
              nombre={partido.equipo_visitante}
              info={infoEquipos?.[partido.equipo_visitante]}
            />
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

        {/* Fichas (solo VIP) */}
        {!esJunior && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-3 py-2.5">
              <span className="text-yellow-400 text-base leading-none mt-px shrink-0">!</span>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-black text-yellow-300 uppercase tracking-wide">
                  {prediccionExistente ? 'Editando apuesta' : 'Límite de apuesta'}
                </p>
                <p className="text-[11px] text-yellow-200/70 leading-snug">
                  {prediccionExistente ? (
                    <>
                      Puedes <span className="font-bold text-yellow-300">reducir libremente</span> (mín. 10) y recuperar fichas.
                      {' '}Para <span className="font-bold text-yellow-300">aumentar</span>, el tope es{' '}
                      <span className="font-bold text-yellow-300">{maxApuesta} fichas</span>{' '}
                      (30% de tus {fichasEfectivas.toLocaleString()} fichas disponibles).
                    </>
                  ) : (
                    <>
                      Puedes apostar entre <span className="font-bold text-yellow-300">10</span> y{' '}
                      <span className="font-bold text-yellow-300">{maxApuesta} fichas</span>{' '}
                      (30% de tus {fichasEfectivas.toLocaleString()} fichas).
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Fichas a apostar</span>
              <span className="text-yellow-400 font-bold text-sm tabular-nums">{fichasApostadas.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={10}
              max={sliderMax}
              step={10}
              value={fichasApostadas}
              onChange={(e) => setFichasApostadas(Number(e.target.value))}
              className="w-full accent-green-400"
            />
            <div className="flex justify-between text-xs text-slate-600">
              <span>Mín: 10</span>
              <span>Máx: {sliderMax.toLocaleString()} fichas</span>
            </div>
          </div>
        )}

        {/* Puntos potenciales (JUNIOR) / Ganancias potenciales (VIP) */}
        <div className="bg-slate-900 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
            {esJunior ? 'Puntos potenciales' : 'Ganancias potenciales'}
          </p>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">
              Resultado exacto {esEmpate ? '(empate)' : ''}
            </span>
            <span className="text-green-400 font-bold text-sm">
              {esJunior ? '+3 pts' : `+${gananciaExacto} fichas`}
            </span>
          </div>
          {!esEmpate && (
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Ganador correcto</span>
              <span className="text-yellow-400 font-bold text-sm">
                {esJunior ? '+2 pts' : `+${gananciaGanador} fichas`}
              </span>
            </div>
          )}
          {esJunior && (
            <div className="flex justify-between">
              <span className="text-xs text-slate-400">Fallo</span>
              <span className="text-slate-500 font-bold text-sm">0 pts</span>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-950/50 border border-red-900/50 rounded-xl px-3 py-3">
            <span className="text-red-400 text-base leading-none mt-px shrink-0">✕</span>
            <p className="text-sm text-red-300 leading-snug">{error}</p>
          </div>
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
    </div>
  )
}
