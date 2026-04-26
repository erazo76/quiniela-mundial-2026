'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { marcarOnboardingVisto } from '@/lib/session'

const SLIDES = [
  {
    emoji: '🏆',
    titulo: '¡Bienvenido a la Quiniela!',
    descripcion:
      'Predecí los resultados de los 96 partidos del Mundial 2026. Ganás fichas al acertar y el que termina con más fichas se queda con el pote de la liga.',
  },
  {
    emoji: '🎯',
    titulo: 'Cómo predecir',
    descripcion:
      'Antes de cada partido ingresás el marcador que esperás. Las predicciones se cierran 5 minutos antes del inicio del partido. No podés cambiarlas después.',
  },
  {
    emoji: '🪙',
    titulo: 'Las fichas',
    descripcion:
      'Arrancás con 1000 fichas. Antes de cada partido elegís cuántas apostar: mínimo 10, máximo el 30% de tu saldo actual.',
  },
  {
    emoji: '✖️',
    titulo: 'Los multiplicadores',
    descripcion:
      'Marcador exacto → ganás 3x lo apostado\nAcertás ganador o empate → ganás 1.5x\nFallás → perdés lo apostado',
  },
  {
    emoji: '💰',
    titulo: 'El pote virtual',
    descripcion:
      'El pote es la suma de todas las fichas de tu liga. Al final del Mundial, quien tenga más fichas gana. El premio real (si lo hay) se coordina fuera de la app.',
  },
  {
    emoji: '🔥',
    titulo: 'Extras y bonos',
    descripcion:
      '3 aciertos seguidos = Racha de oro (fichas doradas ✨)\nSi quedás en 0 fichas recibís 300 de regalo una sola vez (bono de rescate).',
  },
  {
    emoji: '⚖️',
    titulo: 'Aviso importante',
    descripcion:
      'Esta app es exclusivamente recreativa entre amigos. No se realizan transacciones con dinero real dentro de la plataforma. Cualquier premio en efectivo es responsabilidad exclusiva de los usuarios.',
  },
]

interface OnboardingProps {
  onClose: () => void
}

export function Onboarding({ onClose }: OnboardingProps) {
  const [slide, setSlide] = useState(0)
  const [direction, setDirection] = useState(1)
  const isLast = slide === SLIDES.length - 1

  function goNext() {
    if (isLast) {
      marcarOnboardingVisto()
      onClose()
      return
    }
    setDirection(1)
    setSlide(s => s + 1)
  }

  function goPrev() {
    setDirection(-1)
    setSlide(s => s - 1)
  }

  function handleSkip() {
    marcarOnboardingVisto()
    onClose()
  }

  const current = SLIDES[slide]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {slide + 1} / {SLIDES.length}
          </span>
          <button onClick={handleSkip} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Saltar
          </button>
        </div>

        {/* Slide content */}
        <div className="px-6 pb-2 min-h-[220px] flex flex-col justify-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide}
              custom={direction}
              initial={{ x: direction * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -60, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center gap-4"
            >
              <span className="text-6xl">{current.emoji}</span>
              <h2 className="text-xl font-black uppercase text-white leading-tight">{current.titulo}</h2>
              <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">{current.descripcion}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 py-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > slide ? 1 : -1); setSlide(i) }}
              className={`w-2 h-2 rounded-full transition-all ${i === slide ? 'bg-green-400 w-4' : 'bg-slate-700'}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 px-6 pb-6">
          {slide > 0 && (
            <button
              onClick={goPrev}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm uppercase rounded-xl transition-colors"
            >
              Anterior
            </button>
          )}
          <button
            onClick={goNext}
            className="flex-1 py-3 bg-green-500 hover:bg-green-400 active:scale-95 text-black font-bold text-sm uppercase rounded-xl transition-all"
          >
            {isLast ? '¡A jugar!' : 'Siguiente'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
