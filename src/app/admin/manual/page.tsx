import { PrintButton } from '@/components/manual/PrintButton'

export const metadata = { title: 'Manual Admin — Quiniela Mundial 2026' }

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
        <p className="text-slate-500 text-sm mt-2">Guia completa para gestionar ligas, partidos y resultados</p>
        <div className="mt-4 h-0.5 bg-slate-200 rounded" />
      </div>

      {/* Indice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 print:mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Contenido</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
          <li>Acceso al panel de administrador</li>
          <li>Panel de partidos</li>
          <li>Sincronizacion automatica de resultados</li>
          <li>Panel de ligas</li>
          <li>Gestion de miembros y PINs</li>
          <li>Pote virtual — distribucion de premios</li>
          <li>Eliminacion de ligas</li>
        </ol>
      </div>

      {/* 1 */}
      <H2>1. Acceso al panel de administrador</H2>
      <P>
        Accede a <strong>/admin</strong> desde el navegador. Introduce el token de administrador
        configurado en la variable de entorno <code className="bg-slate-100 px-1 rounded text-xs">ADMIN_TOKEN</code>.
        El token se guarda en el localStorage bajo la clave <code className="bg-slate-100 px-1 rounded text-xs">qm2026_admin_token</code>,
        por lo que no tendrás que ingresarlo cada vez desde el mismo navegador.
      </P>
      <Recuadro titulo="Seguridad" color="yellow">
        <P>El token admin nunca expira automáticamente. Si sospechas que fue comprometido, cambia la variable de entorno <code className="bg-yellow-100 px-1 rounded text-xs">ADMIN_TOKEN</code> en Vercel y redeploy.</P>
      </Recuadro>

      <P>El panel tiene dos secciones principales accesibles desde la barra de navegación:</P>
      <ul className="list-disc list-inside space-y-1 mb-4 ml-2">
        <Li><Pill color="green">Partidos</Pill> — gestión de resultados y fases</Li>
        <Li><Pill color="slate">Ligas</Pill> — gestión de ligas y miembros</Li>
      </ul>

      {/* 2 */}
      <H2>2. Panel de partidos</H2>
      <P>
        Muestra todos los partidos del torneo, agrupados por fase. Las fases disponibles son:
        Grupos, Dieciseisavos, Octavos, Cuartos, Semis, Tercer puesto y Final.
      </P>

      <H3>Actualizar resultado de un partido</H3>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Selecciona la fase desde las pestañas horizontales.</li>
        <li>Localiza el partido. Los partidos finalizados aparecen en solo lectura.</li>
        <li>Introduce los goles del equipo local y visitante en los campos numéricos.</li>
        <li>Cambia el estado: <Pill>Pendiente</Pill> <Pill color="green">En vivo</Pill> <Pill color="blue">Finalizado</Pill></li>
        <li>Pulsa <strong>Guardar</strong>. Si el estado es <em>Finalizado</em>, el sistema calcula automaticamente todas las predicciones de ese partido y actualiza las fichas de los jugadores.</li>
      </ol>
      <Recuadro titulo="Importante" color="red">
        <P>Una vez que un partido se marca como <strong>Finalizado</strong>, los controles de edicion desaparecen. El resultado queda grabado y las fichas ya han sido distribuidas. No es posible revertirlo desde el panel.</P>
      </Recuadro>

      <H3>Ver predicciones por partido</H3>
      <P>
        Cada tarjeta de partido tiene un enlace <strong>&ldquo;Ver predicciones&rdquo;</strong> que expande una tabla
        con todos los participantes que apostaron, su prediccion, fichas apostadas, tipo de acierto y ganancia.
      </P>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse border border-slate-200 rounded">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-700">Campo</th>
              <th className="border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-700">Descripcion</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Nombre', 'Usuario que realizó la prediccion'],
              ['Pred', 'Marcador predicho (ej. 2-1)'],
              ['Fichas', 'Fichas apostadas en ese partido'],
              ['Tipo acierto', 'exacto / ganador / fallo / pendiente'],
              ['Ganancia', 'Fichas netas ganadas (negativo si perdio)'],
            ].map(([campo, desc]) => (
              <tr key={campo}>
                <td className="border border-slate-200 px-2 py-1 font-mono text-slate-800">{campo}</td>
                <td className="border border-slate-200 px-2 py-1 text-slate-600">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3 */}
      <H2>3. Sincronizacion automatica de resultados</H2>
      <P>
        El sistema puede sincronizar resultados en tiempo real desde la API de football-data.org.
        Existen dos mecanismos:
      </P>
      <H3>Manual (desde el panel)</H3>
      <P>
        Boton <strong>Sincronizar</strong> en el encabezado del panel de partidos.
        Llama a <code className="bg-slate-100 px-1 rounded text-xs">POST /api/admin/sync</code>.
        Actualiza resultados y estados de partidos en vivo.
      </P>
      <H3>Automatica con Vercel Cron</H3>
      <P>
        El archivo <code className="bg-slate-100 px-1 rounded text-xs">vercel.json</code> incluye
        una tarea programada cada 30 minutos que llama a{' '}
        <code className="bg-slate-100 px-1 rounded text-xs">/api/cron/sync-resultados</code>.
      </P>
      <Recuadro titulo="Variable de entorno requerida" color="yellow">
        <P>
          Debes definir <code className="bg-yellow-100 px-1 rounded text-xs">CRON_SECRET</code> en el dashboard de Vercel
          (Settings &gt; Environment Variables). El cron la usa para autenticarse. Sin ella, el cron retornara 401.
        </P>
      </Recuadro>

      {/* 4 */}
      <H2>4. Panel de ligas</H2>
      <P>
        Lista todas las ligas creadas, ordenadas por fecha de creación (mas recientes primero).
        Cada tarjeta muestra: nombre de la liga, codigo de invitacion, número de miembros y fecha de creacion.
      </P>
      <P>
        Pulsa en la tarjeta para expandirla y ver la lista de miembros con sus fichas y racha actual.
      </P>

      {/* 5 */}
      <H2>5. Gestion de miembros y PINs</H2>
      <P>
        Dentro de cada liga expandida, cada fila de miembro incluye:
      </P>
      <ul className="list-disc list-inside space-y-1 mb-4 ml-2">
        <Li>Nombre del jugador</Li>
        <Li>Fichas actuales</Li>
        <Li>Racha de aciertos (se muestra si &ge; 3)</Li>
        <Li>Indicador <Pill color="yellow">Sin PIN</Pill> si el jugador no ha configurado su PIN</Li>
        <Li>Indicador <Pill>bono usado</Pill> si el bono de rescate fue utilizado</Li>
      </ul>

      <H3>Resetear PIN de un jugador</H3>
      <P>
        Si un jugador olvida su PIN, pulsa el boton <strong>Reset PIN</strong> en su fila.
        Esto borra su PIN actual; el jugador podrá configurar uno nuevo al iniciar sesion.
        El boton esta deshabilitado si el jugador no tiene PIN configurado.
      </P>

      {/* 6 */}
      <H2>6. Pote virtual — distribucion de premios</H2>
      <P>
        Cada apuesta genera una contribucion del <strong>5 %</strong> al pote virtual de la liga.
        El pote acumulado se muestra en la tarjeta de liga cuando es mayor a 0.
      </P>

      <H3>Como distribuir el pote</H3>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>En la tarjeta de la liga, pulsa <strong>Distribuir pote</strong>.</li>
        <li>Aparece un mensaje de confirmacion. Pulsa <strong>Confirmar</strong> para ejecutar.</li>
        <li>El sistema reparte el pote entre los 3 primeros del ranking:</li>
      </ol>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse border border-slate-200 rounded">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Posicion</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Porcentaje</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Ejemplo (1000 fichas de pote)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-slate-200 px-3 py-1.5">1er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold text-green-700">60 %</td><td className="border border-slate-200 px-3 py-1.5">600 fichas</td></tr>
            <tr className="bg-slate-50"><td className="border border-slate-200 px-3 py-1.5">2do lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold text-green-700">25 %</td><td className="border border-slate-200 px-3 py-1.5">250 fichas</td></tr>
            <tr><td className="border border-slate-200 px-3 py-1.5">3er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold text-green-700">15 %</td><td className="border border-slate-200 px-3 py-1.5">150 fichas</td></tr>
          </tbody>
        </table>
      </div>

      <Recuadro titulo="Nota sobre el redondeo" color="slate">
        <P>Si el reparto no es exacto por decimales, el residuo va al 1er lugar. El pote se resetea a 0 tras la distribucion. La operacion queda registrada en el historial de fichas de cada premiado.</P>
      </Recuadro>

      {/* 7 */}
      <H2>7. Eliminacion de ligas</H2>
      <P>
        Para eliminar una liga, pulsa el boton <strong>✕</strong> a la derecha de la tarjeta.
        Aparece una banda de confirmacion roja con el nombre de la liga y el numero de miembros afectados.
      </P>
      <Recuadro titulo="Advertencia — accion irreversible" color="red">
        <P>
          Al confirmar, se eliminan en cascada: todos los miembros de la liga, sus predicciones y su historial de fichas.
          La liga y todos sus datos desaparecen permanentemente. Esta accion no puede deshacerse.
        </P>
      </Recuadro>

      <div className="mt-12 print:mt-6 pt-6 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-400">Quiniela Mundial 2026 — Manual de administrador — v1.0</p>
      </div>
    </main>
    </>
  )
}
