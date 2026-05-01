export const metadata = { title: 'Manual de usuario — Quiniela Mundial 2026' }

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-black uppercase tracking-widest text-slate-800 border-b-2 border-slate-800 pb-1 mt-8 mb-4 print:mt-6">
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-bold text-slate-700 mt-5 mb-2">{children}</h3>
  )
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
    slate: 'bg-slate-100 text-slate-800 border border-slate-300',
  }
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${colors[color]}`}>
      {children}
    </span>
  )
}

function Recuadro({ titulo, children, color = 'slate' }: { titulo: string; children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    green: 'border-green-400 bg-green-50',
    yellow: 'border-yellow-400 bg-yellow-50',
    red: 'border-red-400 bg-red-50',
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
    <main className="max-w-3xl mx-auto px-6 py-10 print:py-4 print:px-4 font-sans">
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
          <li>Configurar tu PIN</li>
          <li>Hacer una prediccion</li>
          <li>Como se calculan los puntos</li>
          <li>El pote de la liga</li>
          <li>Bono de rescate</li>
          <li>Tablero — partidos, grupos y llaves</li>
          <li>Ranking</li>
          <li>Tu perfil — avatar, historial e invitaciones</li>
          <li>Efectos visuales y de audio</li>
        </ol>
      </div>

      {/* 1 */}
      <H2>1. Crear o unirte a una liga</H2>
      <H3>Crear una liga nueva</H3>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Accede a la aplicacion desde tu navegador o movil.</li>
        <li>Pulsa <strong>Crear liga</strong>.</li>
        <li>Introduce el nombre de la liga y tu nombre de jugador.</li>
        <li>Se generara automaticamente un codigo de invitacion unico (ej. <code className="bg-slate-100 px-1 rounded font-mono text-xs">XK29A</code>).</li>
        <li>Comparte ese codigo con tus amigos para que se unan.</li>
      </ol>

      <H3>Unirse a una liga existente</H3>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Pulsa <strong>Unirme a una liga</strong> o visita <strong>/unirme</strong>.</li>
        <li>Introduce el codigo de invitacion que te compartio el organizador.</li>
        <li>Escribe tu nombre de jugador y pulsa <strong>Unirme</strong>.</li>
      </ol>

      {/* 2 */}
      <H2>2. Configurar tu PIN</H2>
      <P>
        La primera vez que inicias sesion, el sistema te pedira que configures un PIN de 4 digitos.
        Este PIN reemplaza la contrasena: la proxima vez que entres solo necesitas tu nombre y PIN.
      </P>
      <Recuadro titulo="Si olvidas tu PIN" color="yellow">
        <P>Contacta al administrador de tu liga para que lo resetee. El admin puede hacerlo desde el panel de ligas pulsando <strong>Reset PIN</strong> en tu fila.</P>
      </Recuadro>

      {/* 3 */}
      <H2>3. Hacer una prediccion</H2>
      <P>
        En la pestana <strong>Partidos</strong> (icono de balon), verás la lista de partidos disponibles.
        Los partidos pendientes muestran el boton <strong>Apostar</strong>.
      </P>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Pulsa <strong>Apostar</strong> en el partido que quieres predecir.</li>
        <li>Introduce el marcador que esperas (goles local y visitante).</li>
        <li>Elige cuantas fichas apostar. El minimo es 10 fichas.</li>
        <li>Confirma tu prediccion.</li>
      </ol>
      <Recuadro titulo="Cambiar una prediccion" color="slate">
        <P>Puedes modificar tu prediccion mientras el partido siga en estado <Pill>Pendiente</Pill>. Al cambiarla, la diferencia de fichas se ajusta al pote o se te devuelve segun corresponda.</P>
      </Recuadro>
      <Recuadro titulo="Una vez en vivo o finalizado" color="red">
        <P>No se aceptan nuevas predicciones ni modificaciones cuando el partido esta <Pill color="green">En vivo</Pill> o <Pill color="blue">Finalizado</Pill>.</P>
      </Recuadro>

      {/* 4 */}
      <H2>4. Como se calculan los puntos</H2>
      <P>
        Cuando el administrador marca un partido como finalizado, el sistema evalua todas las predicciones
        automaticamente y actualiza las fichas de cada jugador.
      </P>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse border border-slate-200 rounded">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Resultado</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Condicion</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Ganancia</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-yellow-50">
              <td className="border border-slate-200 px-3 py-2 font-bold text-yellow-700">Exacto</td>
              <td className="border border-slate-200 px-3 py-2">Acertaste el marcador exacto (ej. 2-1 = 2-1)</td>
              <td className="border border-slate-200 px-3 py-2 font-bold text-yellow-700">x 3 las fichas apostadas</td>
            </tr>
            <tr className="bg-green-50">
              <td className="border border-slate-200 px-3 py-2 font-bold text-green-700">Ganador</td>
              <td className="border border-slate-200 px-3 py-2">Acertaste quien gana o si hay empate</td>
              <td className="border border-slate-200 px-3 py-2 font-bold text-green-700">x 2 las fichas apostadas</td>
            </tr>
            <tr className="bg-red-50">
              <td className="border border-slate-200 px-3 py-2 font-bold text-red-700">Fallo</td>
              <td className="border border-slate-200 px-3 py-2">El resultado no coincide con lo que predijiste</td>
              <td className="border border-slate-200 px-3 py-2 font-bold text-red-700">Pierdes las fichas apostadas</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Recuadro titulo="Ejemplo" color="green">
        <P>Apuestas 50 fichas al partido Argentina vs Brasil prediciendo 2-1. El resultado final es 2-1.</P>
        <P><strong>Resultado: Exacto</strong> — Ganas 50 x 3 = 150 fichas. Tu balance sube en 100 fichas netas (150 - 50 apostadas).</P>
      </Recuadro>

      {/* 5 */}
      <H2>5. El pote de la liga</H2>
      <P>
        El <strong>5 %</strong> de cada apuesta (sobre la diferencia neta de fichas) se acumula en el pote virtual de la liga.
        Este pote crece durante todo el torneo.
      </P>
      <P>
        Al final del torneo, el administrador distribuye el pote entre los tres primeros del ranking:
      </P>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse border border-slate-200 rounded">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Posicion</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Premio</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-slate-200 px-3 py-1.5">1er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold">60 % del pote</td></tr>
            <tr className="bg-slate-50"><td className="border border-slate-200 px-3 py-1.5">2do lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold">25 % del pote</td></tr>
            <tr><td className="border border-slate-200 px-3 py-1.5">3er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold">15 % del pote</td></tr>
          </tbody>
        </table>
      </div>
      <P>Puedes ver el pote acumulado en tiempo real en la pestana <strong>Ranking</strong> de la aplicacion.</P>

      {/* 6 */}
      <H2>6. Bono de rescate</H2>
      <P>
        Si tus fichas llegan a <strong>0</strong>, el sistema te otorga automaticamente un bono de rescate
        de <strong>300 fichas</strong>. Este bono se puede usar una sola vez por jugador durante todo el torneo.
      </P>
      <Recuadro titulo="Estado del bono" color="green">
        <P>Puedes ver si tu bono esta disponible o ya fue usado en la pestana <strong>Perfil</strong>, seccion &ldquo;Bono de rescate&rdquo;.</P>
      </Recuadro>

      {/* 7 */}
      <H2>7. Tablero — partidos, grupos y llaves</H2>
      <P>
        La pestana <strong>Tablero</strong> tiene tres vistas accesibles desde las pestanas superiores:
      </P>
      <H3>Partidos</H3>
      <P>Lista cronologica de todos los partidos con su estado actual, resultado (si ya finalizo) y tu prediccion.</P>
      <H3>Grupos</H3>
      <P>
        Vista de tabla por grupo (A, B, C&hellip;) con todos los partidos de la fase de grupos.
        Puedes ver goles y resultado de cada partido.
      </P>
      <H3>Llaves</H3>
      <P>Vista de eliminacion directa: dieciseisavos, octavos, cuartos, semis, tercer puesto y final.</P>

      <Recuadro titulo="Feedback visual en tus predicciones" color="slate">
        <P>Las tarjetas de partido que ya tienes prediccion muestran tu marcador predicho. Una vez finalizado, verás un badge de color:</P>
        <ul className="list-none space-y-1 mt-2">
          <li><Pill color="yellow">EXACTO</Pill> — marcador exacto acertado (borde amarillo en la tarjeta)</li>
          <li><Pill color="green">GANADOR</Pill> — ganador acertado (borde verde)</li>
          <li><Pill color="red">FALLO</Pill> — no acertaste (borde rojo)</li>
        </ul>
      </Recuadro>

      {/* 8 */}
      <H2>8. Ranking</H2>
      <P>
        La pestana <strong>Ranking</strong> muestra la clasificacion de todos los jugadores de tu liga
        ordenados por fichas de mayor a menor.
      </P>
      <P>
        En la parte superior se muestra el pote acumulado y la distribucion proyectada para el 1er, 2do y 3er lugar
        con los nombres actuales de quienes ocupan esas posiciones.
      </P>
      <P>Tu posicion en el ranking aparece resaltada.</P>

      {/* 9 */}
      <H2>9. Tu perfil — avatar, historial e invitaciones</H2>
      <H3>Avatar</H3>
      <P>Pulsa sobre tu avatar en la pestana <strong>Perfil</strong> para abrir el selector y elegir entre los avatares disponibles. El avatar se guarda localmente en tu dispositivo.</P>

      <H3>Estadisticas</H3>
      <P>Verás tus fichas totales, racha actual de aciertos, numero total de predicciones y porcentaje de acierto.</P>

      <H3>Historial de movimientos</H3>
      <P>La seccion <strong>Movimientos</strong> muestra los ultimos 20 cambios en tus fichas: apuestas, ganancias, devoluciones y premios.</P>

      <H3>Invitar amigos</H3>
      <P>
        Tu codigo de invitacion aparece en grande en la seccion <strong>Invitar amigos</strong>.
        Puedes copiarlo al portapapeles o compartirlo directamente por WhatsApp o con el boton nativo de compartir del dispositivo.
      </P>

      {/* 10 */}
      <H2>10. Efectos visuales y de audio</H2>
      <P>La aplicacion incluye efectos de sonido y visuales para hacer la experiencia mas dinamica:</P>

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
              ['Abrir resultado de partido finalizado (Exacto)', 'Sonido de ganador + fanfarria'],
              ['Abrir resultado de partido finalizado (Ganador)', 'Sonido de crowd goal'],
              ['Abrir resultado de partido finalizado (Fallo)', 'Sonido decepcionante'],
              ['Hacer una apuesta', 'Sonido de moneda'],
              ['Resultado exacto en tarjeta', 'Borde amarillo dorado en la tarjeta'],
              ['Resultado ganador en tarjeta', 'Borde verde en la tarjeta'],
              ['Resultado fallo en tarjeta', 'Borde rojo en la tarjeta'],
            ].map(([evento, efecto]) => (
              <tr key={evento} className="odd:bg-slate-50">
                <td className="border border-slate-200 px-3 py-1.5 text-slate-700">{evento}</td>
                <td className="border border-slate-200 px-3 py-1.5 text-slate-600">{efecto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Recuadro titulo="Nota" color="slate">
        <P>Los efectos de audio se reproducen al abrir el modal de detalle de un partido ya finalizado, no en tiempo real. Asegurate de tener el volumen activado en tu dispositivo.</P>
      </Recuadro>

      <div className="mt-12 print:mt-6 pt-6 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-400">Quiniela Mundial 2026 — Manual de usuario — v1.0</p>
      </div>
    </main>
  )
}
