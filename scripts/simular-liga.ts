/**
 * Simulación completa de una liga — Quiniela Mundial 2026
 *
 * Usa la API real del servidor (debe estar corriendo en localhost:3000).
 * Crea una liga nueva con 11 participantes, simula apuestas en cada fase
 * y carga resultados aleatorios, mostrando el ranking tras cada fase.
 * Al finalizar abre un browser Chromium con la pantalla de ranking real.
 *
 * Uso:
 *   npm run dev          (en otra terminal)
 *   npm run simular
 */

import { chromium } from 'playwright'

const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'quiniela2026admin'

// ---------------------------------------------------------------------------
// Participantes
// ---------------------------------------------------------------------------

interface Participante {
  nombre: string
  pin: string
  id?: string
  fichas?: number
}

const PARTICIPANTES: Participante[] = [
  { nombre: 'Gustavo',   pin: '1234' },
  { nombre: 'Carolina',  pin: '2345' },
  { nombre: 'Rodrigo',   pin: '3456' },
  { nombre: 'Valentina', pin: '4567' },
  { nombre: 'Mateo',     pin: '5678' },
  { nombre: 'Sofía',     pin: '6789' },
  { nombre: 'Diego',     pin: '7890' },
  { nombre: 'Laura',     pin: '8901' },
  { nombre: 'Nicolás',   pin: '9012' },
  { nombre: 'Camila',    pin: '0123' },
  { nombre: 'Sebastián', pin: '1111' },
]

// Fases del Mundial 2026 en orden y cuántos partidos simular por fase
const FASES: Array<{ nombre: string; limite: number }> = [
  { nombre: 'grupos',        limite: 8 },
  { nombre: 'dieciseisavos', limite: 8 },
  { nombre: 'octavos',       limite: 8 },
  { nombre: 'cuartos',       limite: 4 },
  { nombre: 'semis',         limite: 2 },
  { nombre: 'tercer_puesto', limite: 1 },
  { nombre: 'final',         limite: 1 },
]

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

interface RankingEntry {
  posicion: number
  id: string
  nombre: string
  fichas: number
  racha: number
  bono_usado: boolean
  predicciones_total: number
  predicciones_acertadas: number
}

// ---------------------------------------------------------------------------
// Helpers de API (fetch nativo — Node 18+)
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
  if (!r.ok) throw new Error(`GET ${path} [${r.status}]: ${(data as Record<string, unknown>).error ?? JSON.stringify(data)}`)
  return data
}

// ---------------------------------------------------------------------------
// Helpers de simulación
// ---------------------------------------------------------------------------

function randomScore(): [number, number] {
  // Distribución realista: partidos de 0-4 goles
  const pool = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4]
  return [
    pool[Math.floor(Math.random() * pool.length)],
    pool[Math.floor(Math.random() * pool.length)],
  ]
}

const FASES_ELIMINACION = new Set(['dieciseisavos', 'octavos', 'cuartos', 'semis'])

// In knockout phases, draws go to penalties — pick a random winner
function ganadorPenales(
  fase: string,
  equipoLocal: string,
  equipoVisitante: string,
  rl: number,
  rv: number
): string | undefined {
  if (!FASES_ELIMINACION.has(fase)) return undefined
  if (rl !== rv) return undefined
  return Math.random() < 0.5 ? equipoLocal : equipoVisitante
}

function calcApuesta(fichas: number): number {
  if (fichas < 10) return 0
  // Respeta la regla del servidor: max = Math.max(floor(fichas*0.3), 10)
  const max = Math.max(Math.floor(fichas * 0.3), 10)
  return 10 + Math.floor(Math.random() * (max - 10 + 1))
}

// ---------------------------------------------------------------------------
// Output en consola
// ---------------------------------------------------------------------------

function printRanking(entries: RankingEntry[], pote: number, label: string) {
  const LINE = '─'.repeat(66)
  const fichaMax = Math.max(...entries.map(e => e.fichas), 1)

  console.log()
  console.log(LINE)
  console.log(`  RANKING — ${label.toUpperCase()}`)
  console.log(`  Pote virtual de la liga: ${pote.toLocaleString()} fichas`)
  console.log(LINE)
  console.log(
    `  ${'Pos'.padEnd(4)} ${'Nombre'.padEnd(14)} ${'Fichas'.padStart(7)}  ${'Aciertos'.padStart(9)}  Extra`
  )
  console.log(LINE)
  for (const e of entries) {
    const pos =
      e.posicion === 1 ? '1er'
      : e.posicion === 2 ? '2do'
      : e.posicion === 3 ? '3ro'
      : `${e.posicion}.`
    const acc = `${e.predicciones_acertadas}/${e.predicciones_total}`
    const extras: string[] = []
    if (e.racha >= 3) extras.push(`racha ${e.racha} (oro)`)
    else if (e.racha > 0) extras.push(`racha ${e.racha}`)
    if (e.bono_usado) extras.push('rescatado')
    // Mini barra de fichas (relativa al líder)
    const barLen = 10
    const filled = Math.round((e.fichas / fichaMax) * barLen)
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled)
    console.log(
      `  ${pos.padEnd(4)} ${e.nombre.padEnd(14)} ${String(e.fichas).padStart(7)}  ${acc.padStart(9)}  ${bar} ${extras.join(' · ')}`
    )
  }
  console.log(LINE)
}

function printPhaseHeader(fase: string, count: number) {
  const DLINE = '═'.repeat(66)
  console.log()
  console.log(DLINE)
  console.log(`  FASE: ${fase.toUpperCase()}  (${count} partido${count !== 1 ? 's' : ''} simulados)`)
  console.log(DLINE)
}

// ---------------------------------------------------------------------------
// Validaciones al final de cada fase
// ---------------------------------------------------------------------------

function validarRanking(entries: RankingEntry[], fase: string): boolean {
  const issues: string[] = []
  for (const e of entries) {
    if (e.fichas < 0) issues.push(`${e.nombre} tiene fichas negativas (${e.fichas})`)
  }
  if (issues.length === 0) {
    console.log(`  Validaciones OK: todos los saldos son >= 0`)
  } else {
    console.log(`  ALERTAS (${fase}):`)
    issues.forEach(i => console.log(`    ⚠  ${i}`))
  }
  return issues.length === 0
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log()
  console.log('━'.repeat(66))
  console.log('  SIMULACION — QUINIELA MUNDIAL 2026')
  console.log('━'.repeat(66))
  console.log()

  // 1. Verificar que el servidor está corriendo
  try {
    const r = await fetch(`${BASE}/`)
    if (!r.ok && r.status !== 404) throw new Error()
  } catch {
    console.error(`No hay respuesta en ${BASE}`)
    console.error('Ejecuta primero: npm run dev')
    process.exit(1)
  }
  console.log(`Servidor: ${BASE}`)

  // 2. Login de admin
  const { token: adminToken } = await apiPost<{ token: string }>('/api/admin/login', {
    password: ADMIN_PASSWORD,
  })
  console.log('Admin autenticado.')

  // 3. Crear liga con el primer participante como fundador
  const [fundador, ...resto] = PARTICIPANTES
  const { liga, usuario: fundadorUser } = await apiPost<{
    liga: { id: string; nombre_liga: string; codigo_invitacion: string }
    usuario: { id: string; fichas: number }
  }>('/api/ligas', {
    nombreUsuario: fundador.nombre,
    nombreLiga: `Liga Simulación ${new Date().getFullYear()}`,
    pin: fundador.pin,
  })
  fundador.id = fundadorUser.id
  fundador.fichas = fundadorUser.fichas

  console.log(`Liga: "${liga.nombre_liga}" | Código: ${liga.codigo_invitacion}`)
  console.log(`Fundador: ${fundador.nombre} (${fundador.fichas} fichas)`)

  // 4. Unir al resto de participantes
  process.stdout.write(`Registrando ${resto.length} participantes más`)
  for (const p of resto) {
    const { usuario } = await apiPost<{ usuario: { id: string; fichas: number } }>('/api/unirse', {
      codigoInvitacion: liga.codigo_invitacion,
      nombreUsuario: p.nombre,
      pin: p.pin,
    })
    p.id = usuario.id
    p.fichas = usuario.fichas
    process.stdout.write('.')
  }
  console.log()
  console.log(`Total: ${PARTICIPANTES.length} participantes`)
  console.log(`Nombres: ${PARTICIPANTES.map(p => p.nombre).join(', ')}`)

  // ---------------------------------------------------------------------------
  // 5. Loop de fases
  // ---------------------------------------------------------------------------

  let fasesSimuladas = 0
  let totalApostasGlobal = 0
  let bonosUsadosGlobal = 0

  for (const { nombre: fase, limite } of FASES) {
    const todosPartidos = await apiGet<Partido[]>(`/api/partidos?fase=${fase}`)
    const partidos = todosPartidos.filter(p => p.estado === 'pendiente').slice(0, limite)

    if (partidos.length === 0) {
      console.log(`\nFase "${fase}": sin partidos pendientes — saltando.`)
      continue
    }

    fasesSimuladas++
    printPhaseHeader(fase, partidos.length)

    let apuestasFase = 0
    let resultadosFase = 0

    for (const partido of partidos) {
      const label = `${partido.equipo_local} vs ${partido.equipo_visitante}`
      console.log(`\n  Partido: ${label}`)

      // Cada participante apuesta
      let apostaron = 0
      const logApuestas: string[] = []

      for (const p of PARTICIPANTES) {
        if (!p.id) continue

        // Refrescar fichas desde la API
        const userData = await apiGet<{ fichas: number }>(`/api/usuario?id=${p.id}`)
        p.fichas = userData.fichas

        const apuesta = calcApuesta(p.fichas)
        if (apuesta === 0) {
          logApuestas.push(`${p.nombre.padEnd(12)} sin fichas`)
          continue
        }

        const [gl, gv] = randomScore()
        try {
          await apiPost('/api/predicciones', {
            usuario_id: p.id,
            partido_id: partido.id,
            goles_local: gl,
            goles_visitante: gv,
            fichas_apostadas: apuesta,
          })
          apostaron++
          logApuestas.push(`${p.nombre.padEnd(12)} ${String(apuesta).padStart(4)} fichas → ${gl}-${gv}`)
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : ''
          logApuestas.push(`${p.nombre.padEnd(12)} ERROR: ${msg.slice(0, 50)}`)
        }
      }

      // Mostrar apuestas
      for (const log of logApuestas) {
        console.log(`    ${log}`)
      }
      console.log(`    Total apostaron: ${apostaron}/${PARTICIPANTES.length}`)
      apuestasFase += apostaron

      // Cargar resultado oficial (aleatorio)
      const [rl, rv] = randomScore()
      const ganadorManual = ganadorPenales(fase, partido.equipo_local, partido.equipo_visitante, rl, rv)
      await apiPost('/api/admin/resultado', {
        token: adminToken,
        partido_id: partido.id,
        resultado_local: rl,
        resultado_visitante: rv,
        estado: 'finalizado',
        ...(ganadorManual ? { ganador_manual: ganadorManual } : {}),
      })
      const extra = ganadorManual ? ` (penales: ${ganadorManual})` : ''
      console.log(`    Resultado: ${partido.equipo_local} ${rl} — ${rv} ${partido.equipo_visitante}${extra}`)
      resultadosFase++
    }

    console.log(`\n  Resumen: ${apuestasFase} apuestas · ${resultadosFase}/${partidos.length} resultados cargados`)
    totalApostasGlobal += apuestasFase

    // Ranking tras la fase
    const { ranking, pote } = await apiGet<{ ranking: RankingEntry[]; pote: number }>(
      `/api/ranking?liga_id=${liga.id}`
    )
    printRanking(ranking, pote, `tras fase ${fase}`)

    // Actualizar fichas locales
    for (const p of PARTICIPANTES) {
      const entry = ranking.find(r => r.id === p.id)
      if (entry) p.fichas = entry.fichas
    }

    // Contar bonos de rescate usados
    const bonosFase = ranking.filter(r => r.bono_usado).length
    if (bonosFase > bonosUsadosGlobal) {
      const nuevos = bonosFase - bonosUsadosGlobal
      console.log(`  Bono de rescate activado: ${nuevos} participante${nuevos > 1 ? 's' : ''} llegaron a 0 fichas`)
      bonosUsadosGlobal = bonosFase
    }

    // Validar consistencia
    validarRanking(ranking, fase)
  }

  if (fasesSimuladas === 0) {
    console.log('\nNo se encontraron partidos pendientes.')
    console.log('¿Corriste el seed? → npm run seed')
    process.exit(1)
  }

  // ---------------------------------------------------------------------------
  // 6. Resumen global
  // ---------------------------------------------------------------------------

  const { ranking: finalRanking, pote: finalPote } = await apiGet<{
    ranking: RankingEntry[]
    pote: number
  }>(`/api/ranking?liga_id=${liga.id}`)

  console.log()
  console.log('━'.repeat(66))
  console.log('  RESULTADOS FINALES DE LA SIMULACION')
  console.log('━'.repeat(66))
  console.log(`  Fases simuladas:       ${fasesSimuladas}`)
  console.log(`  Apuestas procesadas:   ${totalApostasGlobal}`)
  console.log(`  Bonos de rescate:      ${bonosUsadosGlobal}`)
  console.log(`  Pote final de la liga: ${finalPote.toLocaleString()} fichas`)
  console.log()
  console.log(`  CAMPEON/A: ${finalRanking[0]?.nombre ?? '?'} con ${finalRanking[0]?.fichas?.toLocaleString() ?? 0} fichas`)
  const rachaMax = finalRanking.reduce((acc, e) => Math.max(acc, e.racha), 0)
  const mejorRacha = finalRanking.find(e => e.racha === rachaMax)
  if (mejorRacha && rachaMax > 0) {
    console.log(`  Mejor racha actual:   ${mejorRacha.nombre} (${rachaMax} aciertos consecutivos)`)
  }
  console.log('━'.repeat(66))

  // ---------------------------------------------------------------------------
  // 7. Abrir browser con ranking real en la UI
  // ---------------------------------------------------------------------------

  console.log()
  console.log('Abriendo navegador con la pantalla de ranking real...')

  const browser = await chromium.launch({ headless: false, slowMo: 300 })
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone-like
  })
  const page = await ctx.newPage()

  // Inyectar sesión en localStorage para el fundador
  // También marcamos el onboarding como visto para que no bloquee el click
  await page.goto(`${BASE}/`)
  await page.evaluate(
    (session) => {
      localStorage.setItem('qm2026_session', JSON.stringify(session))
      localStorage.setItem('qm2026_onboarding', '1')
    },
    {
      usuarioId: fundador.id,
      nombre: fundador.nombre,
      ligaId: liga.id,
      ligaNombre: liga.nombre_liga,
      codigoInvitacion: liga.codigo_invitacion,
    }
  )

  await page.goto(`${BASE}/lobby`)
  await page.waitForTimeout(1500)

  // Navegar al tab Ranking
  await page.getByRole('button', { name: /ranking/i }).click()
  await page.waitForTimeout(2000)

  // Screenshot
  const screenshotPath = 'scripts/ranking-final.png'
  await page.screenshot({ path: screenshotPath })
  console.log(`Screenshot guardado: ${screenshotPath}`)
  console.log()
  console.log('El navegador permanece abierto. Ciérralo manualmente o presiona Ctrl+C.')
  console.log()

  // Mantener abierto hasta que el usuario lo cierre
  await page.waitForEvent('close', { timeout: 120_000 }).catch(() => {})
  await browser.close()
}

main().catch((err: unknown) => {
  console.error('\nError en simulacion:', err instanceof Error ? err.message : err)
  process.exit(1)
})
