import { PrintButton } from '@/components/manual/PrintButton'

export const metadata = { title: 'Manual Admin — Quiniela Mundial 2026' }

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
    slate: 'bg-slate-100 text-slate-800 border border-slate-300',
  }
  return <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${colors[color]}`}>{children}</span>
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

export default function ManualAdminPage() {
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
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Manual de administrador</p>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-wide">Quiniela Mundial 2026</h1>
          <p className="text-slate-500 text-sm mt-2">Guía completa para gestionar ligas, partidos y resultados</p>
          <div className="mt-4 h-0.5 bg-slate-200 rounded" />
        </div>

        {/* Indice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 print:mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Contenido</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
            <li>Acceso al panel de administrador</li>
            <li>Panel de partidos — actualizar resultados y desempates de grupos</li>
            <li>Ver predicciones por partido</li>
            <li>Sincronización de resultados</li>
            <li>Panel de ligas</li>
            <li>Gestión de miembros y PINs</li>
            <li>Pote virtual — distribución de premios</li>
            <li>Eliminación de ligas</li>
            <li>Referencia de reglas del juego</li>
          </ol>
        </div>

        {/* 1 */}
        <H2 n={1}>Acceso al panel de administrador</H2>
        <P>Accede a <strong>/admin</strong> desde el navegador e introduce el token de administrador configurado en la variable de entorno <code className="bg-slate-100 px-1 rounded text-xs">ADMIN_TOKEN</code>. El token se guarda en el navegador, por lo que no tendrás que ingresarlo cada vez desde el mismo dispositivo.</P>
        <P>El panel tiene dos secciones:</P>
        <ul className="list-disc list-inside space-y-1 mb-4 ml-2">
          <Li><Pill color="green">Partidos</Pill> — gestión de resultados por fase</Li>
          <Li><Pill color="slate">Ligas</Pill> — gestión de ligas, miembros y pote</Li>
        </ul>
        <Recuadro titulo="Seguridad" color="yellow">
          <P>El token admin no expira automáticamente. Si crees que fue comprometido, cambia la variable <code className="bg-yellow-100 px-1 rounded text-xs">ADMIN_TOKEN</code> en Vercel y redespliega.</P>
        </Recuadro>

        {/* 2 */}
        <H2 n={2}>Panel de partidos — actualizar resultados</H2>
        <P>Muestra todos los partidos agrupados por fase. Usa las pestañas para navegar entre fases: Grupos, Dieciseisavos, Octavos, Cuartos, Semis, Tercer puesto y Final.</P>

        <H3>Flujo para registrar un resultado</H3>
        <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
          <li>Selecciona la fase desde las pestañas horizontales.</li>
          <li>Localiza el partido (los partidos finalizados aparecen en solo lectura).</li>
          <li>Introduce los goles del equipo local y visitante en los campos numéricos.</li>
          <li>Cambia el estado: <Pill>Pendiente</Pill> <Pill color="green">En vivo</Pill> <Pill color="blue">Finalizado</Pill></li>
          <li>Pulsa <strong>Guardar</strong>.</li>
        </ol>

        <Recuadro titulo="Al marcar Finalizado" color="green">
          <P>El sistema calcula automáticamente todas las predicciones de ese partido: determina si cada predicción fue Exacto, Ganador o Fallo, actualiza las fichas de cada jugador, aplica el bonus de racha de oro si corresponde, y activa el bono de rescate si alguien llega a 0 fichas.</P>
          <P>Además, <strong>todos los jugadores que no enviaron predicción</strong> para ese partido reciben una <strong>penalidad de −10 fichas</strong> y su racha se resetea a 0. El bono de rescate también aplica si la penalidad lleva a alguien a 0. El mensaje de confirmación muestra cuántas predicciones fueron procesadas.</P>
        </Recuadro>

        <Recuadro titulo="Importante — acción irreversible" color="red">
          <P>Una vez que un partido se marca como <strong>Finalizado</strong>, los controles de edición desaparecen y las fichas ya fueron distribuidas. No es posible revertir ni recalcular desde el panel.</P>
        </Recuadro>

        <H3>Desempates en la fase de grupos</H3>
        <P>Al final del tab <strong>Fase de grupos</strong>, debajo de todos los partidos, aparece automáticamente el panel de <strong>Desempates manuales (Criterios 7-8 FIFA)</strong>. Este panel:</P>
        <ul className="list-disc list-inside space-y-1 mb-4 ml-2">
          <Li>Solo es visible cuando al menos un grupo tiene <strong>todos sus partidos finalizados</strong>.</Li>
          <Li>Solo muestra grupos donde equipos siguen igualados tras aplicar los 6 criterios automáticos de la FIFA (puntos, diferencia de goles, goles a favor y sus equivalentes en enfrentamientos directos).</Li>
          <Li>Si todos los criterios automáticos resuelven el orden, el panel indica "Sin empates pendientes" y no requiere ninguna acción.</Li>
        </ul>

        <H3>Cómo resolver un desempate manual</H3>
        <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
          <li>Anda a <strong>Admin → Partidos → Fase de grupos</strong> y desplázate hasta el final de la página.</li>
          <li>Localiza el bloque amarillo del grupo con empate (ej. <em>Grupo A</em>).</li>
          <li>Usa las flechas <strong>↑ ↓</strong> para ordenar los equipos empatados según la decisión oficial de la FIFA (por disciplina o sorteo).</li>
          <li>Pulsa <strong>Guardar orden</strong>. La tabla de grupos en la app publica se actualiza de inmediato.</li>
          <li>Si necesitas deshacer el orden, pulsa <strong>Borrar</strong>: el bloque vuelve al orden alfabético hasta que guardes uno nuevo.</li>
        </ol>

        <Recuadro titulo="Criterios automaticos de desempate (FIFA)" color="slate">
          <P>El sistema aplica estos criterios en orden antes de requerir decisión manual:</P>
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li className="text-sm text-slate-600">Puntos (global)</li>
            <li className="text-sm text-slate-600">Diferencia de goles (global)</li>
            <li className="text-sm text-slate-600">Goles a favor (global)</li>
            <li className="text-sm text-slate-600">Puntos en enfrentamientos directos (H2H)</li>
            <li className="text-sm text-slate-600">Diferencia de goles en enfrentamientos directos</li>
            <li className="text-sm text-slate-600">Goles a favor en enfrentamientos directos</li>
          </ol>
          <P>El criterio manual (7-8) solo entra en juego si los 6 anteriores dejan equipos igualados — una situación muy rara en la práctica.</P>
        </Recuadro>

        {/* 3 */}
        <H2 n={3}>Ver predicciones por partido</H2>
        <P>Cada tarjeta de partido tiene el enlace <strong>Ver predicciones</strong> que expande una tabla con todos los participantes que apostaron en ese partido.</P>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-700">Campo</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-700">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Nombre', 'Usuario que realizó la predicción'],
                ['Pred', 'Marcador predicho (ej. 2-1)'],
                ['Fichas', 'Fichas apostadas'],
                ['Tipo acierto', 'exacto / ganador / fallo / pendiente'],
                ['Ganancia', 'Fichas netas recibidas (0 en caso de fallo)'],
              ].map(([campo, desc]) => (
                <tr key={campo}>
                  <td className="border border-slate-200 px-2 py-1 font-mono text-slate-800">{campo}</td>
                  <td className="border border-slate-200 px-2 py-1 text-slate-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4 */}
        <H2 n={4}>Sincronización de resultados</H2>
        <H3>Automática (cronjob.org)</H3>
        <P>Un cron externo en cronjob.org llama a <code className="bg-slate-100 px-1 rounded text-xs">/api/cron/sync-resultados</code> cada 5 minutos durante el torneo. Sincroniza estados y resultados desde la API de football-data.org automáticamente.</P>

        <H3>Manual (desde el panel)</H3>
        <P>El botón <strong>Sincronizar</strong> en el encabezado del panel de partidos ejecuta el mismo proceso bajo demanda. Útil si quieres forzar una actualización inmediata. El mensaje de resultado indica cuántos partidos fueron sincronizados o si no hubo cambios.</P>

        <Recuadro titulo="Variables de entorno requeridas" color="yellow">
          <P><code className="bg-yellow-100 px-1 rounded text-xs">CRON_SECRET</code> — token que usa el cron para autenticarse en el endpoint.</P>
          <P><code className="bg-yellow-100 px-1 rounded text-xs">FOOTBALL_DATA_API_KEY</code> — clave de la API de football-data.org para obtener resultados.</P>
        </Recuadro>

        {/* 5 */}
        <H2 n={5}>Panel de ligas</H2>
        <P>Lista todas las ligas creadas, ordenadas de más reciente a más antigua. Cada tarjeta muestra: nombre, código de invitación, número de miembros y fecha de creación.</P>
        <P>Pulsa en la tarjeta para expandirla y ver la lista de miembros con sus fichas, racha y estado del PIN.</P>

        <H3>Inscripción siempre abierta</H3>
        <P>La inscripción a las ligas <strong>no tiene fecha de cierre</strong>: cualquier jugador puede unirse en cualquier momento, incluso con el torneo ya empezado. No existe un bloqueo por &quot;primer partido&quot;.</P>
        <P>El control real lo hace cada partido: las predicciones de un partido cierran <strong>5 minutos antes de su inicio</strong>. Un jugador que se une tarde no podrá predecir los partidos que ya cerraron, así que simplemente <strong>no suma fichas ni puntos en ellos</strong> (sin penalidad) y empieza a competir desde el siguiente partido pendiente.</P>
        <Recuadro titulo="Sin acción de admin requerida" color="slate">
          <P>No hay que ajustar ninguna fecha para habilitar tardíos: la inscripción está abierta por defecto. La columna <code className="bg-slate-100 px-1 rounded text-xs">cierre_inscripcion</code> quedó obsoleta y el sistema ya no la usa para bloquear adhesiones.</P>
        </Recuadro>

        {/* 6 */}
        <H2 n={6}>Gestión de miembros y PINs</H2>
        <P>Dentro de cada liga expandida, cada fila de miembro muestra:</P>
        <ul className="list-disc list-inside space-y-1 mb-4 ml-2">
          <Li>Nombre del jugador y fichas actuales</Li>
          <Li>Racha de aciertos consecutivos (se muestra si es 3 o más)</Li>
          <Li><Pill color="yellow">Sin PIN</Pill> si el jugador aún no ha configurado su PIN</Li>
          <Li><Pill>bono usado</Pill> si el bono de rescate fue utilizado</Li>
        </ul>

        <H3>Resetear PIN</H3>
        <P>Pulsa <strong>Reset PIN</strong> en la fila del jugador. Esto borra su PIN actual. En el siguiente inicio de sesión, el jugador podrá asignar un PIN nuevo. El botón está deshabilitado si el jugador no tiene PIN configurado.</P>

        {/* 7 */}
        <H2 n={7}>Pote virtual — distribución de premios</H2>
        <P>El <strong>5%</strong> de cada variación neta de apuesta se acumula automáticamente en el pote virtual de la liga. El pote se muestra en la tarjeta de liga cuando es mayor a 0.</P>

        <H3>Distribuir el pote</H3>
        <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
          <li>En la tarjeta de la liga, pulsa <strong>Distribuir pote</strong>.</li>
          <li>Aparece un mensaje de confirmación. Pulsa <strong>Confirmar</strong>.</li>
          <li>El sistema distribuye entre los 3 primeros del ranking por fichas:</li>
        </ol>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Posición</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Porcentaje</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Ejemplo con pote de 1000</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-slate-200 px-3 py-1.5">1er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold text-green-700">60%</td><td className="border border-slate-200 px-3 py-1.5">600 fichas</td></tr>
              <tr className="bg-slate-50"><td className="border border-slate-200 px-3 py-1.5">2do lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold text-green-700">25%</td><td className="border border-slate-200 px-3 py-1.5">250 fichas</td></tr>
              <tr><td className="border border-slate-200 px-3 py-1.5">3er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold text-green-700">15%</td><td className="border border-slate-200 px-3 py-1.5">150 fichas</td></tr>
            </tbody>
          </table>
        </div>

        <Recuadro titulo="Notas sobre la distribución" color="slate">
          <P>Si el redondeo no es exacto, el residuo va al 1er lugar. Si la liga tiene menos de 3 miembros, se distribuye entre los que haya con los mismos porcentajes. El pote se resetea a 0 tras la distribución y queda registrado en el historial de fichas de cada premiado.</P>
        </Recuadro>

        {/* 8 */}
        <H2 n={8}>Eliminación de ligas</H2>
        <P>Pulsa el botón <strong>✕</strong> en la tarjeta de la liga. Aparece una banda roja de confirmación con el nombre y el número de miembros afectados.</P>
        <Recuadro titulo="Advertencia — acción irreversible" color="red">
          <P>Al confirmar se eliminan en cascada: todos los miembros, sus predicciones y su historial de fichas. Esta acción no puede deshacerse.</P>
        </Recuadro>

        {/* 9 */}
        <H2 n={9}>Referencia de reglas del juego</H2>
        <P>Resumen de las reglas para que el admin pueda resolver dudas de los jugadores:</P>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs border-collapse border border-slate-200 rounded">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-700">Regla</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-700">Valor</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Fichas iniciales', '1000 fichas (valor por defecto en la base de datos)'],
                ['Apuesta mínima', '10 fichas'],
                ['Apuesta máxima', '30% del saldo actual del jugador'],
                ['Cierre de predicciones', '5 minutos antes del inicio del partido'],
                ['Exacto (marcador exacto)', 'El jugador recibe 3× lo apostado de vuelta'],
                ['Ganador (resultado correcto)', 'El jugador recibe 1.5× lo apostado de vuelta'],
                ['Fallo', 'El jugador no recupera nada'],
                ['Racha de oro (3er acierto consecutivo en adelante)', '+0.5× al multiplicador (Exacto→3.5×, Ganador→2×)'],
                ['Penalidad por no predecir', '−10 fichas y racha en 0 al finalizar el partido; aplica a todos los jugadores sin predicción'],
                ['Bono de rescate', '100 fichas automáticas si el jugador llega a 0, una sola vez; aplica también si la penalidad lleva a 0'],
                ['Comisión al pote', '5% de cada variación neta de apuesta'],
                ['Inscripción', 'Siempre abierta; un jugador puede unirse en cualquier momento. No se penaliza por los partidos cerrados antes de su alta (quedan en 0)'],
                ['Orden tabla de grupos', 'Criterios FIFA en orden: 1) Pts · 2) Dif goles · 3) Goles a favor · 4) Pts H2H · 5) Dif goles H2H · 6) Goles H2H · 7-8) Decisión manual del admin'],
              ].map(([regla, valor]) => (
                <tr key={regla} className="odd:bg-slate-50">
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-700 font-medium">{regla}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-600">{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 print:mt-6 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">Quiniela Mundial 2026 — Manual de administrador — v1.4</p>
        </div>
      </main>
    </>
  )
}
