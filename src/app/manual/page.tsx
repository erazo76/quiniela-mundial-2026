import { PrintButton } from '@/components/manual/PrintButton'

export const metadata = { title: 'Manual de usuario — Quiniela Mundial 2026' }

function H2({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-black uppercase tracking-widest text-slate-800 border-b-2 border-slate-800 pb-1 mt-8 mb-4 print:mt-6">
      {n}. {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold text-slate-700 mt-5 mb-2">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-600 leading-relaxed mb-2">{children}</p>
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-sm text-slate-600 leading-relaxed">{children}</li>
}

function Pill({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border border-green-300',
    red: 'bg-red-100 text-red-800 border border-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    blue: 'bg-blue-100 text-blue-800 border border-blue-300',
    amber: 'bg-amber-100 text-amber-800 border border-amber-300',
    slate: 'bg-slate-100 text-slate-800 border border-slate-300',
  }
  return <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${colors[color]}`}>{children}</span>
}

function Recuadro({ titulo, children, color = 'slate' }: { titulo: string; children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    green: 'border-green-400 bg-green-50',
    yellow: 'border-yellow-400 bg-yellow-50',
    red: 'border-red-400 bg-red-50',
    amber: 'border-amber-400 bg-amber-50',
    slate: 'border-slate-400 bg-slate-50',
  }
  return (
    <div className={`border-l-4 rounded-r-xl px-4 py-3 mb-4 ${colors[color]}`}>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">{titulo}</p>
      {children}
    </div>
  )
}

export default function ManualUsuarioPage() {
  return (
    <>
      <PrintButton />
      <main className="relative z-10 min-h-screen bg-white max-w-3xl mx-auto px-6 py-10 print:py-4 print:px-4 font-sans shadow-xl">
        <style>{`
          @media print {
            @page { margin: 1.5cm; size: A4; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}</style>

        {/* Portada */}
        <div className="text-center mb-10 print:mb-6">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Manual de usuario</p>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-wide">Quiniela Mundial 2026</h1>
          <p className="text-slate-500 text-sm mt-2">Todo lo que necesitas saber para jugar y ganar fichas</p>
          <div className="mt-4 h-0.5 bg-slate-200 rounded" />
        </div>

        {/* Indice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 print:mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Contenido</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
            <li>Crear o unirte a una liga</li>
            <li>Iniciar sesion (volver a entrar)</li>
            <li>Hacer una prediccion</li>
            <li>Como se calculan las ganancias</li>
            <li>Racha de oro</li>
            <li>El pote de la liga</li>
            <li>Bono de rescate</li>
            <li>Tablero de partidos</li>
            <li>Ranking</li>
            <li>Tu perfil</li>
            <li>Efectos visuales y de audio</li>
          </ol>
        </div>

        {/* 1 */}
        <H2 n={1}>Crear o unirte a una liga</H2>
        <P>Al entrar por primera vez a la aplicacion debes elegir si crear una liga nueva o unirte a una existente. En ambos casos recibes <strong>1000 fichas</strong> de inicio.</P>

        <H3>Crear una liga nueva</H3>
        <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
          <li>Pulsa <strong>Crear liga</strong>.</li>
          <li>Introduce el nombre de la liga y tu nombre de jugador.</li>
          <li>Elige un PIN de 4 digitos — lo usarás cada vez que inicies sesion.</li>
          <li>Se genera automaticamente un codigo de invitacion de 6 caracteres (ej. <code className="bg-slate-100 px-1 rounded font-mono text-xs">XK29A1</code>). Compartelo con tus amigos.</li>
        </ol>

        <H3>Unirse a una liga existente</H3>
        <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
          <li>Pulsa <strong>Unirme a una liga</strong> o visita <strong>/unirme</strong>.</li>
          <li>Introduce el codigo de invitacion que te compartio el organizador.</li>
          <li>Escribe tu nombre de jugador (debe ser unico dentro de tu liga).</li>
          <li>Elige tu PIN de 4 digitos y confirma.</li>
        </ol>

        <Recuadro titulo="Nombre de jugador" color="slate">
          <P>El nombre debe ser unico dentro de tu liga. Si otro jugador ya usa ese nombre, el sistema te pedira que elijas uno diferente.</P>
        </Recuadro>

        {/* 2 */}
        <H2 n={2}>Iniciar sesion (volver a entrar)</H2>
        <P>En tu proxima visita, el sistema reconoce tu sesion guardada automaticamente. Si la sesion expiro o accedes desde otro dispositivo:</P>
        <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
          <li>Introduce el codigo de invitacion de tu liga.</li>
          <li>Escribe tu nombre exacto.</li>
          <li>Ingresa tu PIN de 4 digitos.</li>
        </ol>
        <Recuadro titulo="Si olvidaste tu PIN" color="yellow">
          <P>Contacta al administrador de tu liga para que lo resetee. El siguiente inicio de sesion te permitira asignar un nuevo PIN.</P>
        </Recuadro>

        {/* 3 */}
        <H2 n={3}>Hacer una prediccion</H2>
        <P>En la pestana <strong>Partidos</strong> encontraras todos los partidos disponibles. Los partidos con estado <Pill>Pendiente</Pill> aceptan predicciones.</P>

        <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
          <li>Pulsa <strong>Apostar</strong> en el partido que quieres predecir.</li>
          <li>Introduce el marcador que esperas (goles local y visitante).</li>
          <li>Elige cuantas fichas apostar y confirma.</li>
        </ol>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Regla</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-slate-200 px-3 py-1.5">Apuesta minima</td><td className="border border-slate-200 px-3 py-1.5 font-bold">10 fichas</td></tr>
              <tr className="bg-slate-50"><td className="border border-slate-200 px-3 py-1.5">Apuesta maxima</td><td className="border border-slate-200 px-3 py-1.5 font-bold">30% de tu saldo actual</td></tr>
              <tr><td className="border border-slate-200 px-3 py-1.5">Cierre de predicciones</td><td className="border border-slate-200 px-3 py-1.5 font-bold">5 minutos antes del partido</td></tr>
            </tbody>
          </table>
        </div>

        <Recuadro titulo="Modificar una prediccion" color="slate">
          <P>Puedes cambiar tu prediccion (marcador y fichas) mientras el partido siga <Pill>Pendiente</Pill> y falten mas de 5 minutos. Si subes la apuesta se descuenta la diferencia; si la bajas, se te devuelven las fichas sobrantes.</P>
        </Recuadro>

        <Recuadro titulo="Una vez iniciado el partido" color="red">
          <P>No se aceptan predicciones ni modificaciones cuando el partido esta <Pill color="green">En vivo</Pill> o <Pill color="blue">Finalizado</Pill>.</P>
        </Recuadro>

        {/* 4 */}
        <H2 n={4}>Como se calculan las ganancias</H2>
        <P>Las fichas apostadas se descuentan de tu saldo en el momento de apostar. Cuando el administrador marca el partido como finalizado, el sistema calcula el resultado de cada prediccion y acredita las ganancias automaticamente.</P>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Resultado</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Condicion</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Recibes de vuelta</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Ganancia neta</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-yellow-50">
                <td className="border border-slate-200 px-3 py-2 font-bold text-yellow-700">Exacto</td>
                <td className="border border-slate-200 px-3 py-2">Marcador exacto (ej. 2-1 = 2-1)</td>
                <td className="border border-slate-200 px-3 py-2 font-bold">3× lo apostado</td>
                <td className="border border-slate-200 px-3 py-2 font-bold text-yellow-700">+2× la apuesta</td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-slate-200 px-3 py-2 font-bold text-green-700">Ganador</td>
                <td className="border border-slate-200 px-3 py-2">Acertaste quien gana o si hay empate</td>
                <td className="border border-slate-200 px-3 py-2 font-bold">1.5× lo apostado</td>
                <td className="border border-slate-200 px-3 py-2 font-bold text-green-700">+0.5× la apuesta</td>
              </tr>
              <tr className="bg-red-50">
                <td className="border border-slate-200 px-3 py-2 font-bold text-red-700">Fallo</td>
                <td className="border border-slate-200 px-3 py-2">El resultado no coincide</td>
                <td className="border border-slate-200 px-3 py-2 font-bold">0</td>
                <td className="border border-slate-200 px-3 py-2 font-bold text-red-700">-1× la apuesta</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Recuadro titulo="Ejemplo con 100 fichas apostadas" color="green">
          <ul className="space-y-1">
            <Li><strong>Exacto</strong>: recibes 300 fichas → ganancia neta +200 fichas</Li>
            <Li><strong>Ganador</strong>: recibes 150 fichas → ganancia neta +50 fichas</Li>
            <Li><strong>Fallo</strong>: recibes 0 fichas → perdida de 100 fichas</Li>
          </ul>
        </Recuadro>

        {/* 5 */}
        <H2 n={5}>Racha de oro</H2>
        <P>La racha de oro es un bonus por consistencia. A partir del <strong>tercer acierto consecutivo</strong> (sin fallos de por medio), el multiplicador de tus ganancias sube automaticamente.</P>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Resultado</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Sin racha</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Con racha de oro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-yellow-50">
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-yellow-700">Exacto</td>
                <td className="border border-slate-200 px-3 py-1.5">3× lo apostado</td>
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-yellow-700">3.5× lo apostado</td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-green-700">Ganador</td>
                <td className="border border-slate-200 px-3 py-1.5">1.5× lo apostado</td>
                <td className="border border-slate-200 px-3 py-1.5 font-bold text-green-700">2× lo apostado</td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul className="list-disc list-inside space-y-1 mb-4 ml-2">
          <Li>Cuenta tanto Exacto como Ganador para la racha.</Li>
          <Li>Cualquier <strong>Fallo</strong> rompe la racha y vuelves a 0.</Li>
          <Li>Tu racha actual se muestra en la pestana <strong>Perfil</strong> y en el <strong>Ranking</strong>.</Li>
          <Li>La racha de oro se indica con un indicador de fuego junto a tu nombre en el ranking.</Li>
        </ul>

        <Recuadro titulo="Ejemplo de racha" color="amber">
          <P>Llevas 3 aciertos seguidos. Apuestas 100 fichas en el siguiente partido y aciertas el ganador: recibes 200 fichas (2× con racha) en lugar de 150 (1.5× sin racha).</P>
        </Recuadro>

        {/* 6 */}
        <H2 n={6}>El pote de la liga</H2>
        <P>El <strong>5%</strong> de cada apuesta neta se acumula automaticamente en el pote virtual de la liga. Este pote crece durante todo el torneo y puedes verlo en la pestana <strong>Ranking</strong>.</P>
        <P>Al final del torneo, el administrador distribuye el pote entre los tres primeros del ranking:</P>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Posicion</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Premio</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-slate-200 px-3 py-1.5">1er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold">60% del pote</td></tr>
              <tr className="bg-slate-50"><td className="border border-slate-200 px-3 py-1.5">2do lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold">25% del pote</td></tr>
              <tr><td className="border border-slate-200 px-3 py-1.5">3er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold">15% del pote</td></tr>
            </tbody>
          </table>
        </div>

        {/* 7 */}
        <H2 n={7}>Bono de rescate</H2>
        <P>Si tus fichas llegan a <strong>0</strong> tras calcularse el resultado de un partido, el sistema te otorga automaticamente un bono de rescate de <strong>300 fichas</strong>.</P>
        <ul className="list-disc list-inside space-y-1 mb-4 ml-2">
          <Li>El bono se activa solo una vez por jugador durante todo el torneo.</Li>
          <Li>Se aplica automaticamente — no necesitas hacer nada.</Li>
          <Li>Puedes ver su estado (Disponible / Usado) en la pestana <strong>Perfil</strong>.</Li>
        </ul>

        {/* 8 */}
        <H2 n={8}>Tablero de partidos</H2>
        <P>La pestana <strong>Tablero</strong> tiene tres vistas:</P>
        <H3>Partidos</H3>
        <P>Lista cronologica de todos los partidos con su estado, resultado (si ya finalizo) y tu prediccion. Los badges de color indican el resultado de tu apuesta:</P>
        <ul className="list-none space-y-1 mb-3 ml-2">
          <Li><Pill color="yellow">EXACTO</Pill> — marcador exacto (borde amarillo en la tarjeta)</Li>
          <Li><Pill color="green">GANADOR</Pill> — ganador acertado (borde verde)</Li>
          <Li><Pill color="red">FALLO</Pill> — no acertaste (borde rojo)</Li>
        </ul>
        <H3>Grupos</H3>
        <P>Vista de tabla por grupo (A, B, C...) con todos los partidos de la fase de grupos.</P>
        <H3>Llaves</H3>
        <P>Vista de eliminacion directa: dieciseisavos, octavos, cuartos, semis, tercer puesto y final.</P>

        {/* 9 */}
        <H2 n={9}>Ranking</H2>
        <P>Muestra la clasificacion de todos los jugadores de tu liga ordenados por fichas de mayor a menor. En la parte superior verás el pote acumulado y como quedaria distribuido con los jugadores actuales en las primeras posiciones.</P>
        <P>Tu posicion en el ranking aparece resaltada. Las rachas activas de 3 o mas aciertos se indican junto al nombre del jugador.</P>

        {/* 10 */}
        <H2 n={10}>Tu perfil</H2>
        <H3>Avatar</H3>
        <P>Pulsa tu avatar para abrír el selector y elegir entre los disponibles. El avatar se guarda en tu navegador.</P>
        <H3>Estadisticas</H3>
        <P>Fichas actuales, racha de aciertos, total de predicciones y porcentaje de acierto.</P>
        <H3>Historial de movimientos</H3>
        <P>Pulsa <strong>Movimientos</strong> para expandir el historial de tus ultimos cambios de fichas: apuestas, ganancias, devoluciones, premios del pote y bono de rescate. Navega con los botones Anterior / Siguiente (5 registros por pagina).</P>
        <H3>Invitar amigos</H3>
        <P>Tu codigo de invitacion aparece en la seccion <strong>Invitar amigos</strong>. Puedes copiarlo al portapapeles o compartirlo por WhatsApp.</P>

        {/* 11 */}
        <H2 n={11}>Efectos visuales y de audio</H2>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Evento</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Efecto</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Abrir resultado Exacto', 'Fanfarria de ganador'],
                ['Abrir resultado Ganador', 'Sonido de gol / crowd'],
                ['Abrir resultado Fallo', 'Sonido decepcionante'],
                ['Confirmar una apuesta', 'Sonido de moneda'],
                ['Tarjeta con resultado Exacto', 'Borde amarillo dorado'],
                ['Tarjeta con resultado Ganador', 'Borde verde'],
                ['Tarjeta con resultado Fallo', 'Borde rojo'],
              ].map(([evento, efecto]) => (
                <tr key={evento} className="odd:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-1.5 text-slate-700">{evento}</td>
                  <td className="border border-slate-200 px-3 py-1.5 text-slate-600">{efecto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Recuadro titulo="Nota sobre el audio" color="slate">
          <P>Los sonidos se reproducen al abrir el detalle de un partido ya finalizado, no en tiempo real. Asegurate de tener el volumen activado en tu dispositivo.</P>
        </Recuadro>

        <div className="mt-12 print:mt-6 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">Quiniela Mundial 2026 — Manual de usuario — v1.1</p>
        </div>
      </main>
    </>
  )
}
