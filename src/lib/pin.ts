import { compare, hash } from 'bcryptjs'

// Los PIN de 4 dígitos se guardaban en texto plano en usuarios.pin. Ahora se
// guardan como hash bcrypt. Los PIN antiguos siguen funcionando: verificarPin
// los acepta y /api/unirse los reescribe como hash en el primer login, así que
// no hizo falta una migración de datos.
const ROUNDS = 10

// Un hash bcrypt siempre empieza por $2a$/$2b$/$2y$; un PIN heredado son 4
// dígitos. Distinguirlos no necesita más que el prefijo.
const PREFIJO_BCRYPT = /^\$2[aby]\$/

export function esHash(almacenado: string): boolean {
  return PREFIJO_BCRYPT.test(almacenado)
}

export async function hashPin(pin: string | number): Promise<string> {
  return hash(String(pin), ROUNDS)
}

export async function verificarPin(pin: string | number, almacenado: string): Promise<boolean> {
  if (esHash(almacenado)) return compare(String(pin), almacenado)
  return String(pin) === almacenado
}

// El cliente guarda el usuario en localStorage; el PIN (hash incluido) no tiene
// por qué salir del servidor.
export function sinPin<T extends { pin?: unknown }>(usuario: T): Omit<T, 'pin'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pin, ...resto } = usuario
  return resto
}
