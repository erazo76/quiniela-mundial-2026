export const TOTAL_AVATARES = 23

// Avatares femeninos identificados visualmente
const FEMENINOS = new Set([2, 5, 9, 14, 21])

export function esFemenino(index: number) {
  return FEMENINOS.has(index)
}

function storageKey(usuarioId: string) {
  return `qm2026_avatar_${usuarioId}`
}

export function getAvatarIndex(usuarioId: string, nombre: string): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(storageKey(usuarioId))
    if (saved) return Number(saved)
  }
  // Heurística: nombres españoles femeninos suelen terminar en 'a'
  const terminaEnA = nombre.trim().split(' ')[0].toLowerCase().endsWith('a')
  if (terminaEnA) {
    const fems = Array.from(FEMENINOS)
    const hash = nombre.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return fems[hash % fems.length]
  }
  const hash = nombre.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return (hash % TOTAL_AVATARES) + 1
}

export function setAvatarIndex(usuarioId: string, index: number) {
  localStorage.setItem(storageKey(usuarioId), String(index))
}

export function avatarSrc(index: number): string {
  return `/avatares/${index}.png`
}

export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

