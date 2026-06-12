'use client'
import { useEffect, useMemo, useState } from 'react'

export interface DiaDisponible {
  key: string // YYYY-MM-DD
  fecha: string // ISO del primer partido del día
  total: number
  conPrediccion: number
}

interface Props {
  dias: DiaDisponible[]
  valor: string | null // key seleccionada
  onSelect: (key: string) => void
}

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function fechaKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inicioMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function sumarMeses(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

export function CalendarioPartidos({ dias, valor, onSelect }: Props) {
  const [abierto, setAbierto] = useState(false)

  // Mapa de días con partidos para lookup rápido
  const mapaDias = useMemo(() => {
    const m = new Map<string, DiaDisponible>()
    for (const d of dias) m.set(d.key, d)
    return m
  }, [dias])

  // Rango de meses navegables (primer y último mes con partidos)
  const { mesMin, mesMax } = useMemo(() => {
    if (dias.length === 0) {
      const hoy = inicioMes(new Date())
      return { mesMin: hoy, mesMax: hoy }
    }
    const primera = new Date(dias[0].fecha)
    const ultima = new Date(dias[dias.length - 1].fecha)
    return { mesMin: inicioMes(primera), mesMax: inicioMes(ultima) }
  }, [dias])

  const diaSeleccionado = valor ? mapaDias.get(valor) : undefined
  const [mesVisible, setMesVisible] = useState(() =>
    inicioMes(diaSeleccionado ? new Date(diaSeleccionado.fecha) : new Date())
  )

  // Abre el calendario situándolo en el mes del día seleccionado
  function abrir() {
    setMesVisible(inicioMes(diaSeleccionado ? new Date(diaSeleccionado.fecha) : mesMin))
    setAbierto(true)
  }

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [abierto])

  const hoyKey = fechaKey(new Date())

  // Celdas del mes visible (semana empieza en lunes)
  const celdas = useMemo(() => {
    const y = mesVisible.getFullYear()
    const m = mesVisible.getMonth()
    const offset = (new Date(y, m, 1).getDay() + 6) % 7 // lunes = 0
    const diasEnMes = new Date(y, m + 1, 0).getDate()
    const lista: (Date | null)[] = []
    for (let i = 0; i < offset; i++) lista.push(null)
    for (let d = 1; d <= diasEnMes; d++) lista.push(new Date(y, m, d))
    return lista
  }, [mesVisible])

  const puedeRetroceder = inicioMes(mesVisible) > mesMin
  const puedeAvanzar = inicioMes(mesVisible) < mesMax

  // Etiqueta del trigger
  const triggerLabel = (() => {
    if (!diaSeleccionado) return 'Fecha'
    const d = new Date(diaSeleccionado.fecha)
    const dow = d.toLocaleDateString('es', { weekday: 'short' })
    return `${dow} ${d.getDate()} ${MESES[d.getMonth()]}`
  })()

  function seleccionar(key: string) {
    onSelect(key)
    setAbierto(false)
  }

  return (
    <>
      {/* Trigger estilo chip */}
      <button
        onClick={abrir}
        className="flex items-center gap-2 shrink-0 px-3.5 py-2 rounded-2xl border bg-slate-900 border-slate-700 text-white hover:border-slate-600 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-400 shrink-0">
          <rect x="3" y="4.5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-bold capitalize whitespace-nowrap">{triggerLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-slate-500 shrink-0">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Modal calendario */}
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-base font-black text-white">Elegir fecha</h3>
              <button
                onClick={() => setAbierto(false)}
                className="text-slate-500 hover:text-white text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            {/* Navegación de mes */}
            <div className="flex items-center justify-between px-5 pb-3">
              <button
                onClick={() => setMesVisible(sumarMeses(mesVisible, -1))}
                disabled={!puedeRetroceder}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-default hover:border-slate-600 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-sm font-bold text-white">
                {MESES_LARGO[mesVisible.getMonth()]} {mesVisible.getFullYear()}
              </span>
              <button
                onClick={() => setMesVisible(sumarMeses(mesVisible, 1))}
                disabled={!puedeAvanzar}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-default hover:border-slate-600 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Cabecera días de la semana */}
            <div className="grid grid-cols-7 gap-1 px-5">
              {DIAS_SEMANA.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-bold text-slate-600 uppercase py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grilla de días */}
            <div className="grid grid-cols-7 gap-1 px-5 pb-6 pt-1">
              {celdas.map((d, i) => {
                if (!d) return <div key={i} />
                const key = fechaKey(d)
                const dia = mapaDias.get(key)
                const disponible = !!dia
                const seleccionado = key === valor
                const esHoy = key === hoyKey
                return (
                  <button
                    key={i}
                    disabled={!disponible}
                    onClick={() => disponible && seleccionar(key)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-colors ${
                      seleccionado
                        ? 'bg-green-500 text-black font-black'
                        : disponible
                          ? 'bg-slate-900 border border-slate-800 text-white font-bold hover:border-green-500/60'
                          : 'text-slate-700 font-medium cursor-default'
                    } ${esHoy && !seleccionado ? 'ring-1 ring-green-500/50' : ''}`}
                  >
                    {d.getDate()}
                    {disponible && (
                      <span
                        className={`absolute bottom-1 w-1 h-1 rounded-full ${
                          seleccionado ? 'bg-black/50' : 'bg-green-400'
                        }`}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
