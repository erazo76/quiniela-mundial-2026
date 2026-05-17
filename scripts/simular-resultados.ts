/**
 * simular-resultados.ts — Quiniela Mundial 2026
 *
 * Carga resultados aleatorios sobre partidos EXISTENTES en la DB, en lotes
 * interactivos. No crea ligas ni usuarios — solo pone goles y pasa a finalizado.
 *
 * Lotes:
 *   - Fase de grupos:       10 partidos por lote
 *   - Dieciseisavos:         5 partidos por lote
 *   - Octavos / Cuartos:     fase completa de una vez
 *   - Semis / 3er / Final:   fase completa de una vez
 *
 * El resolver del bracket corre automáticamente en el servidor tras cada
 * resultado (resolverTrasResultado → banderas + equipos en la siguiente fase).
 *
 * Uso:
 *   # Contra localhost (debe estar corriendo npm run dev):
 *   npx tsx scripts/simular-resultados.ts
 *
 *   # Contra producción:
 *   BASE_URL=https://quiniela-mundial-2026-nine.vercel.app npx tsx scripts/simular-resultados.ts
 */

import * as readline from 'readline'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE          = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const ADMIN_PASS    = process.env.ADMIN_PASSWORD ?? 'quiniela2026admin'

/** Tamaño de lote por fase. ≤0 = toda la fase de una vez */
const LOTE: Record<string, number> = {
  grupos:        10,
  dieciseisavos:  5,
  octavos:        0, //  8 partidos — toda la fase
  cuartos:        0, //  4 partidos
  semis:          0, //  2 partidos
  tercer_puesto:  0, //  1 partido
  final:          0, //  1 partido
}

const FASES_ORDEN = ['grupos','dieciseisavos','octavos','cuartos','semis','tercer_puesto','final'] as const
const FASES_ELIM  = new Set(['dieciseisavos','octavos','cuartos','semis','tercer_puesto','final'])

const LABEL: Record<string, string> = {
  grupos:        'Fase de Grupos',
  dieciseisavos: 'Ronda de 32 (Dieciseisavos)',
  octavos:       'Octavos de Final',
  cuartos:       'Cuartos de Final',
  semis:         'Semifinales',
  tercer_puesto: 'Tercer Puesto',
  final:         'Final',
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Partido {
  id: string
  equipo_local: string
  equipo_visitante: string
  fase: string
  estado: string
  fecha_hora: string
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiPost<T = Record<string, unknown>>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await r.json()) as T & { error?: string }
  if (!r.ok) throw new Error(`POST ${path} [${r.status}]: ${data.error ?? JSON.stringify(data)}`)
  return data
}

async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`)
  const data = (await r.json()) as T & { error?: string }
  if (!r.ok) throw new Error(`GET ${path} [${r.status}]: ${(data as Record<string,unknown>).error ?? JSON.stringify(data)}`)
  return data
}

// ---------------------------------------------------------------------------
// Simulación de goles
// ---------------------------------------------------------------------------

function randomScore(): [number, number] {
  const pool = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4]
  return [
    pool[Math.floor(Math.random() * pool.length)],
    pool[Math.floor(Math.random() * pool.length)],
  ]
}

function penalesAleatorios(fase: string, rl: number, rv: number) {
  if (!FASES_ELIM.has(fase) || rl !== rv) return undefined
  const pool = [3, 4, 4, 5, 5, 5, 6, 7]
  let pl = 0, pv = 0
  while (pl === pv) {
    pl = pool[Math.floor(Math.random() * pool.length)]
    pv = pool[Math.floor(Math.random() * pool.length)]
  }
  return { penales_local: pl, penales_visitante: pv }
}

// ---------------------------------------------------------------------------
// Consola interactiva
// ---------------------------------------------------------------------------

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function preguntar(msg: string): Promise<string> {
  return new Promise(resolve => rl.question(msg, resolve))
}

async function confirmar(msg: string): Promise<boolean> {
  const resp = await preguntar(`${msg} [Enter=sí / q=salir] `)
  if (resp.trim().toLowerCase() === 'q') {
    console.log('\nSaliendo.')
    rl.close()
    process.exit(0)
  }
  return true
}

// ---------------------------------------------------------------------------
// Formateo
// ---------------------------------------------------------------------------

const LINE  = '─'.repeat(66)
const DLINE = '═'.repeat(66)

function pad(s: string, n: number) { return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length) }

function printFaseHeader(fase: string) {
  console.log()
  console.log(DLINE)
  console.log(`  ${LABEL[fase] ?? fase.toUpperCase()}`)
  console.log(DLINE)
}

function printLoteResultados(resultados: Array<{
  local: string; visitante: string
  rl: number; rv: number
  penales?: { penales_local: number; penales_visitante: number }
}>) {
  for (const r of resultados) {
    let linea = `  ${pad(r.local, 22)} ${String(r.rl).padStart(2)} - ${String(r.rv).padEnd(2)}  ${r.visitante}`
    if (r.penales) {
      linea += `  (pen: ${r.penales.penales_local}-${r.penales.penales_visitante})`
    }
    console.log(linea)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log()
  console.log(DLINE)
  console.log('  SIMULADOR DE RESULTADOS — Quiniela Mundial 2026')
  console.log(DLINE)
  console.log(`  Servidor: ${BASE}`)
  console.log()

  // Verificar servidor
  try {
    const r = await fetch(`${BASE}/api/partidos?fase=grupos`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
  } catch (e: unknown) {
    console.error(`Error conectando a ${BASE}: ${e instanceof Error ? e.message : e}`)
    console.error('¿Está corriendo el servidor? → npm run dev')
    process.exit(1)
  }

  // Login admin
  const { token } = await apiPost<{ token: string }>('/api/admin/login', { password: ADMIN_PASS })
  console.log('  Admin autenticado.')
  console.log()

  let totalProcesados = 0

  for (const fase of FASES_ORDEN) {
    const todos = await apiGet<Partido[]>(`/api/partidos?fase=${fase}`)
    const pendientes = todos.filter(p => p.estado === 'pendiente')
      .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))

    if (pendientes.length === 0) {
      console.log(`  ${LABEL[fase] ?? fase}: sin partidos pendientes — saltando.`)
      continue
    }

    printFaseHeader(fase)
    console.log(`  ${pendientes.length} partido(s) pendiente(s)`)

    const tamLote = LOTE[fase] > 0 ? LOTE[fase] : pendientes.length
    const totalLotes = Math.ceil(pendientes.length / tamLote)

    for (let loteIdx = 0; loteIdx < totalLotes; loteIdx++) {
      const desde = loteIdx * tamLote
      const lote  = pendientes.slice(desde, desde + tamLote)

      console.log()
      console.log(LINE)
      console.log(`  Lote ${loteIdx + 1}/${totalLotes} — ${lote.length} partido(s)`)
      console.log(LINE)
      for (const p of lote) {
        console.log(`    ${pad(p.equipo_local, 22)} vs  ${p.equipo_visitante}`)
      }
      console.log()

      await confirmar(`  ¿Procesar este lote?`)

      const resultados: Array<{
        local: string; visitante: string
        rl: number; rv: number
        penales?: { penales_local: number; penales_visitante: number }
      }> = []

      for (const partido of lote) {
        const [rl, rv] = randomScore()
        const penales = penalesAleatorios(fase, rl, rv)

        await apiPost('/api/admin/resultado', {
          token,
          partido_id: partido.id,
          resultado_local: rl,
          resultado_visitante: rv,
          estado: 'finalizado',
          ...(penales ?? {}),
        })

        resultados.push({ local: partido.equipo_local, visitante: partido.equipo_visitante, rl, rv, penales })
        totalProcesados++
      }

      console.log()
      console.log('  Resultados cargados:')
      printLoteResultados(resultados)
    }

    console.log()
    console.log(`  ${LABEL[fase] ?? fase} completada. (${pendientes.length} partidos finalizados)`)

    // Pausa entre fases excepto en la última
    if (fase !== 'final') {
      console.log()
      await confirmar('  ¿Continuar con la siguiente fase?')
    }
  }

  console.log()
  console.log(DLINE)
  console.log(`  SIMULACION COMPLETA — ${totalProcesados} partidos procesados`)
  console.log(DLINE)
  console.log()

  rl.close()
}

main().catch((err: unknown) => {
  console.error('\nError:', err instanceof Error ? err.message : err)
  rl.close()
  process.exit(1)
})
