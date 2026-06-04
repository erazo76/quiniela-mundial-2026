'use client'
import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { marcarOnboardingVisto } from '@/lib/session'

interface Slide {
  image: string | null
  titulo: string
  descripcion: string
}

const SLIDES_VIP: Slide[] = [
  {
    image: '/ui/icon-trophy-nav.png',
    titulo: '¡Bienvenido a la Quiniela!',
    descripcion:
      'Predice los resultados de los partidos del Mundial 2026. Ganas fichas al acertar y quien termina con más fichas se queda con el pote de la liga.',
  },
  {
    image: '/ui/icon-star2.png',
    titulo: 'Cómo predecir',
    descripcion:
      'Antes de cada partido ingresas el marcador que esperas. Las predicciones se cierran 5 minutos antes del inicio. No puedes cambiarlas después.\n\nSi no envías ninguna predicción, al finalizar el partido pierdes 10 fichas automáticamente y tu racha se reinicia.\n\nApenas envíes tu predicción, podrás ver las predicciones y las fichas apostadas del resto del grupo en ese partido. Antes de predecir, las de los demás permanecen ocultas.',
  },
  {
    image: '/ui/icon-coins.png',
    titulo: 'Las fichas',
    descripcion:
      'Empiezas con 1000 fichas. Antes de cada partido eliges cuántas apostar: mínimo 10, máximo el 30% de tu saldo actual.',
  },
  {
    image: '/ui/icon-multiplier.png',
    titulo: 'Los multiplicadores',
    descripcion:
      'Marcador exacto → ganas 3× lo apostado\nAciertas ganador o empate → ganas 1.5×\nFallas → pierdes lo apostado',
  },
  {
    image: '/ui/icon-coins5.png',
    titulo: 'El pote virtual',
    descripcion:
      'El 5% de cada apuesta va al pote de la liga. Al final del Mundial, el 1° lugar se lleva el 60%, el 2° el 25% y el 3° el 15%. El premio real (si lo hay) se coordina fuera de la app.',
  },
  {
    image: '/ui/icon-gift.png',
    titulo: 'Extras y bonos',
    descripcion:
      '3 aciertos seguidos activan la Racha de oro: tus multiplicadores suben +0.5× mientras la mantengas (exacto → 3.5×, ganador → 2×).\nSi llegas a 0 fichas, recibes 100 de regalo una sola vez (bono de rescate).',
  },
  {
    image: '/ui/icon-exclamation.png',
    titulo: 'Aviso importante',
    descripcion:
      'Esta app es exclusivamente recreativa entre amigos. No se realizan transacciones con dinero real dentro de la plataforma. Cualquier premio en efectivo es responsabilidad exclusiva de los usuarios.',
  },
]

const SLIDES_JUNIOR: Slide[] = [
  {
    image: '/ui/icon-trophy-nav.png',
    titulo: '¡Bienvenido a la Quiniela!',
    descripcion:
      'Predice los resultados de los partidos del Mundial 2026. En esta liga JUNIOR acumulas puntos por tus aciertos. Quien termina con más puntos gana.',
  },
  {
    image: '/ui/icon-star2.png',
    titulo: 'Cómo predecir',
    descripcion:
      'Antes de cada partido ingresas el marcador que esperas. Las predicciones se cierran 5 minutos antes del inicio.\n\nNo hay fichas ni apuestas: solo eliges el marcador y confirmas.\n\nApenas envíes tu predicción, podrás ver las predicciones del resto del grupo en ese partido. Antes de predecir, las de los demás permanecen ocultas.\n\n💡 Puedes adelantarte y completar todas las predicciones de la fase de una sola vez — no es necesario esperar partido por partido.',
  },
  {
    image: '/ui/icon-multiplier.png',
    titulo: 'Cómo se suman los puntos',
    descripcion:
      'Marcador exacto → +3 puntos\nAciertas ganador o empate correcto → +2 puntos\nFallas → 0 puntos\n\nNo se pierden puntos por no predecir — simplemente no sumas nada ese partido.',
  },
  {
    image: '/ui/icon-compete.png',
    titulo: 'El ranking',
    descripcion:
      'Los puntos se acumulan partido a partido a lo largo de todo el Mundial. Al final, el ranking muestra quién sumó más.\n\nSi hay empate en el podio, el premio acordado se divide entre quienes compartan esa posición.',
  },
  {
    image: '/ui/icon-exclamation.png',
    titulo: 'Aviso importante',
    descripcion:
      'Esta app es exclusivamente recreativa entre amigos. No se realizan transacciones con dinero real dentro de la plataforma. Cualquier premio en efectivo es responsabilidad exclusiva de los usuarios.',
  },
]

interface OnboardingProps {
  ligaTipo: 'vip' | 'junior'
  onClose: () => void
}

export function Onboarding({ ligaTipo, onClose }: OnboardingProps) {
  const SLIDES = ligaTipo === 'junior' ? SLIDES_JUNIOR : SLIDES_VIP
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
              {current.image ? (
                <Image
                  src={current.image}
                  alt=""
                  width={72}
                  height={72}
                  className="drop-shadow-lg"
                  unoptimized
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-yellow-400/50 bg-yellow-400/10 flex items-center justify-center">
                  <span className="text-yellow-400 font-black text-2xl">!</span>
                </div>
              )}
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
