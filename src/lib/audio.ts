'use client'

export function playSound(file: string, volume = 0.6) {
  try {
    const audio = new Audio(`/audio/${file}`)
    audio.volume = volume
    audio.play().catch(() => {})
  } catch {
    // silently ignore
  }
}
