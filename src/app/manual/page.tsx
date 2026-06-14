'use client'
import { useEffect, useState } from 'react'
import { PrintButton } from '@/components/manual/PrintButton'
import { getSession } from '@/lib/session'

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
    blue: 'border-blue-400 bg-blue-50',
    slate: 'border-slate-400 bg-slate-50',
  }
  return (
    <div className={`border-l-4 rounded-r-xl px-4 py-3 mb-4 ${colors[color]}`}>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">{titulo}</p>
      {children}
    </div>
  )
}

function ManualVIP() {
  return (
    <>
      <div className="text-center mb-10 print:mb-6">
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Manual de usuario · Liga MASTER</p>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-wide">Quiniela Mundial 2026</h1>
        <p className="text-slate-500 text-sm mt-2">Todo lo que necesitas saber para jugar y ganar fichas</p>
        <div className="mt-4 h-0.5 bg-slate-200 rounded" />
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 print:mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Contenido</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
          <li>Crear o unirte a una liga</li>
          <li>Iniciar sesión (volver a entrar)</li>
          <li>Hacer una predicción</li>
          <li>Cómo se calculan las ganancias</li>
          <li>Racha de oro</li>
          <li>El pote de la liga</li>
          <li>Bono de rescate</li>
          <li>Tablero de partidos</li>
          <li>Ranking</li>
          <li>Tu perfil</li>
          <li>Efectos visuales y de audio</li>
        </ol>
      </div>

      <H2 n={1}>Crear o unirte a una liga</H2>
      <P>Al entrar por primera vez debes elegir si crear una liga nueva o unirte a una existente. En ambos casos recibes <strong>1000 fichas</strong> de inicio.</P>
      <H3>Crear una liga nueva</H3>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Pulsa <strong>Crear liga</strong>.</li>
        <li>Elige la modalidad <strong>MASTER</strong>.</li>
        <li>Introduce el nombre de la liga y tu nombre de jugador.</li>
        <li>Elige un PIN de 4 dígitos.</li>
        <li>Se genera un código de invitación de 6 caracteres. Compártelo con tus amigos.</li>
      </ol>
      <H3>Unirse a una liga existente</H3>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Pulsa <strong>Unirme a una liga</strong>.</li>
        <li>Introduce el código de invitación.</li>
        <li>Escribe tu nombre de jugador y elige tu PIN.</li>
      </ol>
      <Recuadro titulo="Inscripción siempre abierta" color="yellow">
        <P>Puedes unirte a una liga <strong>en cualquier momento</strong>, incluso con el torneo ya empezado. Ten en cuenta que las predicciones de cada partido cierran 5 minutos antes de su inicio: si te unes tarde, <strong>no podrás predecir los partidos que ya comenzaron</strong> y no sumas fichas en ellos, pero <strong>tampoco se te aplica la penalidad de −10</strong> por esos partidos previos a tu alta. Arrancas a competir desde el siguiente partido pendiente.</P>
      </Recuadro>

      <H2 n={2}>Iniciar sesión (volver a entrar)</H2>
      <P>La sesión se guarda automáticamente. Si expiró o accedes desde otro dispositivo, introduce el código de tu liga, tu nombre y tu PIN.</P>
      <Recuadro titulo="Si olvidaste tu PIN" color="yellow">
        <P>Contacta al administrador de tu liga para que lo resetee.</P>
      </Recuadro>

      <H2 n={3}>Hacer una predicción</H2>
      <P>En la pestaña <strong>Partidos</strong> encontrarás los partidos disponibles. Los <Pill>Pendiente</Pill> aceptan predicciones.</P>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Pulsa el partido que quieres predecir.</li>
        <li>Introduce el marcador esperado.</li>
        <li>Elige cuántas fichas apostar y confirma.</li>
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
            <tr><td className="border border-slate-200 px-3 py-1.5">Apuesta mínima</td><td className="border border-slate-200 px-3 py-1.5 font-bold">10 fichas</td></tr>
            <tr className="bg-slate-50"><td className="border border-slate-200 px-3 py-1.5">Apuesta máxima al crear</td><td className="border border-slate-200 px-3 py-1.5 font-bold">30% de tu saldo actual</td></tr>
            <tr><td className="border border-slate-200 px-3 py-1.5">Cierre de predicciones</td><td className="border border-slate-200 px-3 py-1.5 font-bold">5 minutos antes del partido</td></tr>
            <tr className="bg-red-50"><td className="border border-slate-200 px-3 py-1.5 text-red-700 font-medium">No predecir un partido</td><td className="border border-slate-200 px-3 py-1.5 font-bold text-red-700">−10 fichas + racha en 0</td></tr>
          </tbody>
        </table>
      </div>
      <Recuadro titulo="Modificar una predicción" color="slate">
        <P>Puedes reducir fichas libremente (devolución inmediata). Para aumentar, aplica el límite del 30%. Solo mientras el partido esté <Pill>Pendiente</Pill> y falten más de 5 minutos.</P>
      </Recuadro>
      <Recuadro titulo="Predicciones del grupo (transparencia)" color="blue">
        <P>Una vez que envíes tu predicción, podrás ver las predicciones y las fichas apostadas del resto del grupo en ese partido, en tiempo real. Antes de predecir, las predicciones de los demás permanecen ocultas para que nadie pueda copiar.</P>
      </Recuadro>

      <H2 n={4}>Cómo se calculan las ganancias</H2>
      <P>Las fichas apostadas se descuentan al apostar. Al finalizar el partido, el sistema acredita las ganancias automáticamente.</P>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse border border-slate-200 rounded">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Resultado</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Condición</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Recibes</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Ganancia neta</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-yellow-50">
              <td className="border border-slate-200 px-3 py-2 font-bold text-yellow-700">Exacto</td>
              <td className="border border-slate-200 px-3 py-2">Marcador exacto</td>
              <td className="border border-slate-200 px-3 py-2 font-bold">3× lo apostado</td>
              <td className="border border-slate-200 px-3 py-2 font-bold text-yellow-700">+2× la apuesta</td>
            </tr>
            <tr className="bg-green-50">
              <td className="border border-slate-200 px-3 py-2 font-bold text-green-700">Ganador</td>
              <td className="border border-slate-200 px-3 py-2">Acertaste quién gana, o que hay empate (aunque el marcador no sea exacto)</td>
              <td className="border border-slate-200 px-3 py-2 font-bold">1.5× lo apostado</td>
              <td className="border border-slate-200 px-3 py-2 font-bold text-green-700">+0.5× la apuesta</td>
            </tr>
            <tr className="bg-red-50">
              <td className="border border-slate-200 px-3 py-2 font-bold text-red-700">Fallo</td>
              <td className="border border-slate-200 px-3 py-2">El resultado no coincide</td>
              <td className="border border-slate-200 px-3 py-2 font-bold">0</td>
              <td className="border border-slate-200 px-3 py-2 font-bold text-red-700">−1× la apuesta</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Recuadro titulo="Caso especial: predicción de empate" color="amber">
        <P>Cuando predices un <strong>empate</strong> (mismo marcador para ambos equipos) hay dos formas de acertar:</P>
        <ul className="list-disc list-inside space-y-1">
          <Li><strong>Empate exacto</strong>: predijiste 1-1 y el partido termina 1-1 → cobras <strong>Exacto</strong> (3× lo apostado).</Li>
          <Li><strong>Empate con otro marcador</strong>: predijiste 1-1 y el partido termina 0-0 o 2-2 → igual aciertas el empate y cobras <strong>Ganador</strong> (1.5× lo apostado).</Li>
        </ul>
        <P>Solo es <strong>Fallo</strong> si el partido <em>no</em> termina en empate (por ejemplo, predijiste 1-1 y ganó alguno de los equipos).</P>
      </Recuadro>

      <H2 n={5}>Racha de oro</H2>
      <P>A partir del <strong>3er acierto consecutivo</strong> tus multiplicadores suben +0.5× automáticamente.</P>
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
        <Li>Cualquier <strong>Fallo</strong> rompe la racha y vuelves a 0.</Li>
        <Li>La racha de oro se indica con un ícono de fuego en el ranking.</Li>
      </ul>

      <H2 n={6}>El pote de la liga</H2>
      <P>El <strong>5%</strong> de cada apuesta neta se acumula en el pote virtual de la liga. Al final del torneo se distribuye:</P>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse border border-slate-200 rounded">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Posición</th>
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

      <H2 n={7}>Bono de rescate</H2>
      <P>Si tus fichas llegan a <strong>0</strong>, recibes automáticamente <strong>100 fichas</strong> de regalo. Solo ocurre una vez por jugador durante todo el torneo.</P>

      <H2 n={8}>Tablero de partidos</H2>
      <P>La pestaña <strong>Tablero</strong> tiene tres vistas: Partidos (lista cronológica), Grupos (tabla por grupo con criterios FIFA) y Llaves (eliminación directa).</P>
      <Recuadro titulo="Columnas de la tabla de grupos" color="slate">
        <P><strong>PJ</strong> partidos jugados · <strong>G</strong> ganados · <strong>E</strong> empatados · <strong>P</strong> perdidos · <strong>DG</strong> diferencia de goles (a favor − en contra) · <strong>Pts</strong> puntos (3 por victoria, 1 por empate, 0 por derrota).</P>
      </Recuadro>

      <H2 n={9}>Ranking</H2>
      <P>Muestra la clasificación ordenada por fichas. En la parte superior verás el pote acumulado y su distribución proyectada. Las rachas activas se indican junto al nombre.</P>

      <H2 n={10}>Tu perfil</H2>
      <P>Estadísticas (fichas, racha, predicciones, % de acierto), estado del bono de rescate, historial de movimientos e invitación para amigos.</P>

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
              ['Tarjeta Exacto', 'Borde amarillo dorado'],
              ['Tarjeta Ganador', 'Borde verde'],
              ['Tarjeta Fallo', 'Borde rojo'],
            ].map(([evento, efecto]) => (
              <tr key={evento} className="odd:bg-slate-50">
                <td className="border border-slate-200 px-3 py-1.5 text-slate-700">{evento}</td>
                <td className="border border-slate-200 px-3 py-1.5 text-slate-600">{efecto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ManualJUNIOR() {
  return (
    <>
      <div className="text-center mb-10 print:mb-6">
        <p className="text-xs uppercase tracking-widest text-blue-500 mb-1">Manual de usuario · Liga JUNIOR</p>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-wide">Quiniela Mundial 2026</h1>
        <p className="text-slate-500 text-sm mt-2">Predice, acumula puntos y llega primero al final del Mundial</p>
        <div className="mt-4 h-0.5 bg-blue-200 rounded" />
      </div>

      <Recuadro titulo="Modalidad JUNIOR" color="blue">
        <P>La liga JUNIOR no usa fichas ni apuestas. Solo predices el marcador de cada partido y sumas puntos según el acierto. Sin penalidades, sin racha, sin pote — solo puntos acumulados.</P>
      </Recuadro>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 print:mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Contenido</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
          <li>Crear o unirte a una liga JUNIOR</li>
          <li>Iniciar sesión (volver a entrar)</li>
          <li>Hacer una predicción</li>
          <li>Cómo se suman los puntos</li>
          <li>Tablero de partidos</li>
          <li>Ranking y premio</li>
          <li>Tu perfil</li>
        </ol>
      </div>

      <H2 n={1}>Crear o unirte a una liga JUNIOR</H2>
      <P>Al entrar por primera vez eliges si crear una liga nueva o unirte a una existente. En ambos casos empiezas con <strong>0 puntos</strong>.</P>
      <H3>Crear una liga nueva</H3>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Pulsa <strong>Crear liga</strong>.</li>
        <li>Selecciona la modalidad <strong>JUNIOR</strong>.</li>
        <li>Introduce el nombre de la liga y tu nombre de jugador.</li>
        <li>Elige un PIN de 4 dígitos — lo necesitarás cada vez que entres.</li>
        <li>Se genera un código de invitación de 6 caracteres. Compártelo con todos.</li>
      </ol>
      <H3>Unirse a una liga existente</H3>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Pulsa <strong>Unirme a una liga</strong>.</li>
        <li>Introduce el código de invitación.</li>
        <li>Escribe tu nombre de jugador y elige tu PIN.</li>
      </ol>
      <Recuadro titulo="Inscripción siempre abierta" color="yellow">
        <P>Puedes unirte a una liga <strong>en cualquier momento</strong>, incluso con el torneo ya empezado. Las predicciones de cada partido cierran 5 minutos antes de su inicio: si te unes tarde, <strong>no podrás predecir los partidos que ya comenzaron</strong> y no sumas puntos en ellos. Empiezas a competir desde el siguiente partido pendiente, sin penalidad por los anteriores.</P>
      </Recuadro>

      <H2 n={2}>Iniciar sesión (volver a entrar)</H2>
      <P>La sesión se guarda automáticamente. Si expiró o accedes desde otro dispositivo, introduce el código de tu liga, tu nombre y tu PIN.</P>
      <Recuadro titulo="Si olvidaste tu PIN" color="yellow">
        <P>Contacta al administrador de tu liga para que lo resetee.</P>
      </Recuadro>

      <H2 n={3}>Hacer una predicción</H2>
      <P>En la pestaña <strong>Partidos</strong> encontrarás todos los partidos disponibles. Los <Pill>Pendiente</Pill> aceptan predicciones.</P>
      <ol className="list-decimal list-inside space-y-1.5 mb-4 ml-2 text-sm text-slate-600">
        <li>Pulsa el partido que quieres predecir.</li>
        <li>Introduce el marcador que esperas (goles local y visitante).</li>
        <li>Confirma tu predicción. No hay fichas que apostar.</li>
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
            <tr><td className="border border-slate-200 px-3 py-1.5">Cierre de predicciones</td><td className="border border-slate-200 px-3 py-1.5 font-bold">5 minutos antes del partido</td></tr>
            <tr className="bg-slate-50"><td className="border border-slate-200 px-3 py-1.5">No predecir un partido</td><td className="border border-slate-200 px-3 py-1.5 font-bold">0 puntos (sin penalidad)</td></tr>
          </tbody>
        </table>
      </div>
      <Recuadro titulo="Modificar una predicción" color="slate">
        <P>Puedes cambiar el marcador mientras el partido siga <Pill>Pendiente</Pill> y falten más de 5 minutos. No hay fichas involucradas.</P>
      </Recuadro>
      <Recuadro titulo="Predicciones del grupo (transparencia)" color="blue">
        <P>Una vez que envíes tu predicción, podrás ver las predicciones del resto del grupo en ese partido, en tiempo real. Antes de predecir, las de los demás permanecen ocultas para que nadie pueda copiar.</P>
      </Recuadro>

      <H2 n={4}>Cómo se suman los puntos</H2>
      <P>Al finalizar cada partido el sistema calcula tu acierto y suma los puntos automáticamente.</P>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse border border-slate-200 rounded">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Resultado</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Condición</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Puntos</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-yellow-50">
              <td className="border border-slate-200 px-3 py-2 font-bold text-yellow-700">Exacto</td>
              <td className="border border-slate-200 px-3 py-2">Marcador exacto (ej. 2-1 = 2-1)</td>
              <td className="border border-slate-200 px-3 py-2 font-black text-yellow-700">+3 pts</td>
            </tr>
            <tr className="bg-green-50">
              <td className="border border-slate-200 px-3 py-2 font-bold text-green-700">Ganador / Empate</td>
              <td className="border border-slate-200 px-3 py-2">Acertaste quién gana, o que hay empate (aunque el marcador no sea exacto)</td>
              <td className="border border-slate-200 px-3 py-2 font-black text-green-700">+2 pts</td>
            </tr>
            <tr className="bg-red-50">
              <td className="border border-slate-200 px-3 py-2 font-bold text-red-700">Fallo</td>
              <td className="border border-slate-200 px-3 py-2">El resultado no coincide</td>
              <td className="border border-slate-200 px-3 py-2 font-black text-slate-500">0 pts</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Recuadro titulo="Ejemplo" color="green">
        <ul className="space-y-1">
          <Li>Predijiste 2-1, resultado 2-1 → <strong>+3 puntos</strong> (exacto)</Li>
          <Li>Predijiste 2-0, resultado 3-1 → <strong>+2 puntos</strong> (ganador correcto)</Li>
          <Li>Predijiste 1-0, resultado 0-1 → <strong>0 puntos</strong> (fallo)</Li>
        </ul>
      </Recuadro>
      <Recuadro titulo="Caso especial: predicción de empate" color="amber">
        <P>Cuando predices un <strong>empate</strong> (mismo marcador para ambos) hay dos formas de acertar:</P>
        <ul className="list-disc list-inside space-y-1">
          <Li><strong>Empate exacto</strong>: predijiste 1-1 y termina 1-1 → <strong>+3 puntos</strong>.</Li>
          <Li><strong>Empate con otro marcador</strong>: predijiste 1-1 y termina 0-0 o 2-2 → igual aciertas el empate y sumas <strong>+2 puntos</strong>.</Li>
          <Li>Solo es <strong>0 puntos</strong> si el partido <em>no</em> termina empatado (predijiste 1-1 y ganó alguno).</Li>
        </ul>
      </Recuadro>
      <Recuadro titulo="Sin penalidad por no predecir" color="slate">
        <P>En la liga JUNIOR, si no enviaste ninguna predicción antes del cierre de un partido, simplemente no sumas puntos ese partido. No hay descuento ni penalidad.</P>
      </Recuadro>

      <H2 n={5}>Tablero de partidos</H2>
      <P>La pestaña <strong>Tablero</strong> tiene tres vistas: Partidos (lista cronológica con tus predicciones), Grupos (tabla por grupo con criterios FIFA) y Llaves (eliminación directa).</P>
      <P>La tabla de grupos sigue los <strong>criterios oficiales de la FIFA</strong>: puntos, diferencia de goles, goles a favor, luego criterios de enfrentamiento directo (H2H).</P>
      <Recuadro titulo="Columnas de la tabla de grupos" color="slate">
        <P><strong>PJ</strong> partidos jugados · <strong>G</strong> ganados · <strong>E</strong> empatados · <strong>P</strong> perdidos · <strong>DG</strong> diferencia de goles (a favor − en contra) · <strong>Pts</strong> puntos (3 por victoria, 1 por empate, 0 por derrota).</P>
      </Recuadro>

      <H2 n={6}>Ranking y premio</H2>
      <P>El ranking muestra a todos los jugadores ordenados por puntos acumulados de mayor a menor. Los puntos se suman durante todo el torneo — fase de grupos, octavos, cuartos, semis y final.</P>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse border border-slate-200 rounded">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Posición</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700">Premio (si lo hay)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-slate-200 px-3 py-1.5">1er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold">60% del premio acordado</td></tr>
            <tr className="bg-slate-50"><td className="border border-slate-200 px-3 py-1.5">2do lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold">25% del premio acordado</td></tr>
            <tr><td className="border border-slate-200 px-3 py-1.5">3er lugar</td><td className="border border-slate-200 px-3 py-1.5 font-bold">15% del premio acordado</td></tr>
          </tbody>
        </table>
      </div>
      <Recuadro titulo="Empate en el podio" color="blue">
        <P>Si dos o más jugadores comparten la misma cantidad de puntos en el 1er, 2do o 3er lugar, cualquier premio acordado <strong>se dividirá en partes iguales</strong> entre quienes compartan esa posición.</P>
      </Recuadro>

      <H2 n={7}>Tu perfil</H2>
      <P>Muestra tus puntos acumulados, total de predicciones, porcentaje de acierto, código de invitación para compartir con amigos y el historial de puntos ganados.</P>
    </>
  )
}

export default function ManualUsuarioPage() {
  const [ligaTipo, setLigaTipo] = useState<'vip' | 'junior'>('vip')

  useEffect(() => {
    const session = getSession()
    if (session?.ligaTipo) setLigaTipo(session.ligaTipo)
  }, [])

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

        {ligaTipo === 'junior' ? <ManualJUNIOR /> : <ManualVIP />}

        <div className="mt-12 print:mt-6 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">
            Quiniela Mundial 2026 — Manual {ligaTipo === 'junior' ? 'JUNIOR' : 'MASTER'} — v1.0
          </p>
        </div>
      </main>
    </>
  )
}
