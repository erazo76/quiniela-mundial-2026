-- ============================================================================
-- CORRECCIÓN GRUPOS G–L · Mundial 2026
-- Reemplaza los partidos de los grupos G a L (equipos/fechas/sedes estaban mal
-- asignados respecto al sorteo oficial) y reembolsa las predicciones afectadas.
--
-- NO afecta grupos A–F (correctos) ni eliminatorias (placeholders).
-- Ejecutar UNA sola vez, en el editor SQL de Supabase. Hacer backup antes.
-- Generado desde src/data/partidos.json (fuente de verdad ya corregida).
-- ============================================================================
BEGIN;

-- 1) Historial de devolución: una fila por predicción VIP afectada (junior nunca descontó)
INSERT INTO historial_fichas (usuario_id, tipo, cantidad, descripcion)
SELECT pr.usuario_id, 'devolucion', pr.fichas_apostadas,
       'Devolución por corrección de grupos G–L: ' || pa.equipo_local || ' vs ' || pa.equipo_visitante
FROM predicciones pr
JOIN partidos pa ON pa.id = pr.partido_id
JOIN usuarios u  ON u.id  = pr.usuario_id
JOIN ligas l     ON l.id  = u.liga_id
WHERE pa.fase = 'grupos' AND pa.grupo IN ('G','H','I','J','K','L')
  AND COALESCE(l.tipo, 'vip') <> 'junior';

-- 2) Devolver fichas a cada usuario (suma de sus apuestas en G–L, solo VIP)
UPDATE usuarios u
SET fichas = u.fichas + agg.total
FROM (
  SELECT pr.usuario_id, SUM(pr.fichas_apostadas) AS total
  FROM predicciones pr
  JOIN partidos pa ON pa.id = pr.partido_id
  JOIN usuarios u2 ON u2.id = pr.usuario_id
  JOIN ligas l     ON l.id  = u2.liga_id
  WHERE pa.fase = 'grupos' AND pa.grupo IN ('G','H','I','J','K','L')
    AND COALESCE(l.tipo, 'vip') <> 'junior'
  GROUP BY pr.usuario_id
) agg
WHERE u.id = agg.usuario_id;

-- 3) Revertir la comisión del 5% acumulada al pote de cada liga
UPDATE ligas l
SET pote_virtual = GREATEST(0, l.pote_virtual - agg.comision)
FROM (
  SELECT u.liga_id, ROUND(SUM(pr.fichas_apostadas) * 0.05)::int AS comision
  FROM predicciones pr
  JOIN partidos pa ON pa.id = pr.partido_id
  JOIN usuarios u  ON u.id  = pr.usuario_id
  JOIN ligas l2    ON l2.id = u.liga_id
  WHERE pa.fase = 'grupos' AND pa.grupo IN ('G','H','I','J','K','L')
    AND COALESCE(l2.tipo, 'vip') <> 'junior'
  GROUP BY u.liga_id
) agg
WHERE l.id = agg.liga_id;

-- 4) Borrar predicciones de G–L (explícito; el CASCADE del paso 5 también las quitaría)
DELETE FROM predicciones pr
USING partidos pa
WHERE pa.id = pr.partido_id
  AND pa.fase = 'grupos' AND pa.grupo IN ('G','H','I','J','K','L');

-- 5) Borrar los partidos viejos (incorrectos) de G–L
DELETE FROM partidos
WHERE fase = 'grupos' AND grupo IN ('G','H','I','J','K','L');

-- 6) Insertar los partidos correctos de G–L
INSERT INTO partidos
  (equipo_local, equipo_visitante, bandera_local, bandera_visitante, fase, grupo, fecha_hora, sede, estado)
VALUES
  ('Bélgica', 'Egipto', '/flags/be.png', '/flags/eg.png', 'grupos', 'G', '2026-06-15T15:00:00-07:00', 'Lumen Field, Seattle', 'pendiente'),
  ('Irán', 'Nueva Zelanda', '/flags/ir.png', '/flags/nz.png', 'grupos', 'G', '2026-06-15T21:00:00-07:00', 'SoFi Stadium, Los Ángeles', 'pendiente'),
  ('Bélgica', 'Irán', '/flags/be.png', '/flags/ir.png', 'grupos', 'G', '2026-06-21T12:00:00-07:00', 'SoFi Stadium, Los Ángeles', 'pendiente'),
  ('Nueva Zelanda', 'Egipto', '/flags/nz.png', '/flags/eg.png', 'grupos', 'G', '2026-06-21T18:00:00-07:00', 'BC Place, Vancouver', 'pendiente'),
  ('Egipto', 'Irán', '/flags/eg.png', '/flags/ir.png', 'grupos', 'G', '2026-06-26T20:00:00-07:00', 'Lumen Field, Seattle', 'pendiente'),
  ('Nueva Zelanda', 'Bélgica', '/flags/nz.png', '/flags/be.png', 'grupos', 'G', '2026-06-26T20:00:00-07:00', 'BC Place, Vancouver', 'pendiente'),
  ('España', 'Cabo Verde', '/flags/es.png', '/flags/cv.png', 'grupos', 'H', '2026-06-15T12:00:00-04:00', 'Mercedes-Benz Stadium, Atlanta', 'pendiente'),
  ('Arabia Saudita', 'Uruguay', '/flags/sa.png', '/flags/uy.png', 'grupos', 'H', '2026-06-15T18:00:00-04:00', 'Hard Rock Stadium, Miami', 'pendiente'),
  ('España', 'Arabia Saudita', '/flags/es.png', '/flags/sa.png', 'grupos', 'H', '2026-06-21T12:00:00-04:00', 'Mercedes-Benz Stadium, Atlanta', 'pendiente'),
  ('Uruguay', 'Cabo Verde', '/flags/uy.png', '/flags/cv.png', 'grupos', 'H', '2026-06-21T18:00:00-04:00', 'Hard Rock Stadium, Miami', 'pendiente'),
  ('Cabo Verde', 'Arabia Saudita', '/flags/cv.png', '/flags/sa.png', 'grupos', 'H', '2026-06-26T19:00:00-05:00', 'NRG Stadium, Houston', 'pendiente'),
  ('Uruguay', 'España', '/flags/uy.png', '/flags/es.png', 'grupos', 'H', '2026-06-26T18:00:00-06:00', 'Estadio Akron, Guadalajara', 'pendiente'),
  ('Francia', 'Senegal', '/flags/fr.png', '/flags/sn.png', 'grupos', 'I', '2026-06-16T15:00:00-04:00', 'MetLife Stadium, Nueva York/Nueva Jersey', 'pendiente'),
  ('Irak', 'Noruega', '/flags/iq.png', '/flags/no.png', 'grupos', 'I', '2026-06-16T18:00:00-04:00', 'Gillette Stadium, Boston', 'pendiente'),
  ('Francia', 'Irak', '/flags/fr.png', '/flags/iq.png', 'grupos', 'I', '2026-06-22T17:00:00-04:00', 'Lincoln Financial Field, Filadelfia', 'pendiente'),
  ('Noruega', 'Senegal', '/flags/no.png', '/flags/sn.png', 'grupos', 'I', '2026-06-22T20:00:00-04:00', 'MetLife Stadium, Nueva York/Nueva Jersey', 'pendiente'),
  ('Noruega', 'Francia', '/flags/no.png', '/flags/fr.png', 'grupos', 'I', '2026-06-26T15:00:00-04:00', 'Gillette Stadium, Boston', 'pendiente'),
  ('Senegal', 'Irak', '/flags/sn.png', '/flags/iq.png', 'grupos', 'I', '2026-06-26T15:00:00-04:00', 'BMO Field, Toronto', 'pendiente'),
  ('Argentina', 'Argelia', '/flags/ar.png', '/flags/dz.png', 'grupos', 'J', '2026-06-16T20:00:00-05:00', 'Arrowhead Stadium, Kansas City', 'pendiente'),
  ('Austria', 'Jordania', '/flags/at.png', '/flags/jo.png', 'grupos', 'J', '2026-06-16T21:00:00-07:00', 'Levi''s Stadium, Santa Clara', 'pendiente'),
  ('Argentina', 'Austria', '/flags/ar.png', '/flags/at.png', 'grupos', 'J', '2026-06-22T12:00:00-05:00', 'AT&T Stadium, Arlington', 'pendiente'),
  ('Jordania', 'Argelia', '/flags/jo.png', '/flags/dz.png', 'grupos', 'J', '2026-06-22T20:00:00-07:00', 'Levi''s Stadium, Santa Clara', 'pendiente'),
  ('Argelia', 'Austria', '/flags/dz.png', '/flags/at.png', 'grupos', 'J', '2026-06-27T21:00:00-05:00', 'Arrowhead Stadium, Kansas City', 'pendiente'),
  ('Jordania', 'Argentina', '/flags/jo.png', '/flags/ar.png', 'grupos', 'J', '2026-06-27T21:00:00-05:00', 'AT&T Stadium, Arlington', 'pendiente'),
  ('Portugal', 'República Democrática del Congo', '/flags/pt.png', '/flags/cd.png', 'grupos', 'K', '2026-06-17T12:00:00-05:00', 'NRG Stadium, Houston', 'pendiente'),
  ('Uzbekistán', 'Colombia', '/flags/uz.png', '/flags/co.png', 'grupos', 'K', '2026-06-17T20:00:00-06:00', 'Estadio Azteca, Ciudad de México', 'pendiente'),
  ('Portugal', 'Uzbekistán', '/flags/pt.png', '/flags/uz.png', 'grupos', 'K', '2026-06-23T12:00:00-05:00', 'NRG Stadium, Houston', 'pendiente'),
  ('Colombia', 'República Democrática del Congo', '/flags/co.png', '/flags/cd.png', 'grupos', 'K', '2026-06-23T20:00:00-06:00', 'Estadio Akron, Guadalajara', 'pendiente'),
  ('Colombia', 'Portugal', '/flags/co.png', '/flags/pt.png', 'grupos', 'K', '2026-06-27T19:30:00-04:00', 'Hard Rock Stadium, Miami', 'pendiente'),
  ('República Democrática del Congo', 'Uzbekistán', '/flags/cd.png', '/flags/uz.png', 'grupos', 'K', '2026-06-27T19:30:00-04:00', 'Mercedes-Benz Stadium, Atlanta', 'pendiente'),
  ('Inglaterra', 'Croacia', '/flags/xe.png', '/flags/hr.png', 'grupos', 'L', '2026-06-17T15:00:00-05:00', 'AT&T Stadium, Arlington', 'pendiente'),
  ('Ghana', 'Panamá', '/flags/gh.png', '/flags/pa.png', 'grupos', 'L', '2026-06-17T19:00:00-04:00', 'BMO Field, Toronto', 'pendiente'),
  ('Inglaterra', 'Ghana', '/flags/xe.png', '/flags/gh.png', 'grupos', 'L', '2026-06-23T16:00:00-04:00', 'Gillette Stadium, Boston', 'pendiente'),
  ('Panamá', 'Croacia', '/flags/pa.png', '/flags/hr.png', 'grupos', 'L', '2026-06-23T19:00:00-04:00', 'BMO Field, Toronto', 'pendiente'),
  ('Panamá', 'Inglaterra', '/flags/pa.png', '/flags/xe.png', 'grupos', 'L', '2026-06-27T17:00:00-04:00', 'MetLife Stadium, Nueva York/Nueva Jersey', 'pendiente'),
  ('Croacia', 'Ghana', '/flags/hr.png', '/flags/gh.png', 'grupos', 'L', '2026-06-27T17:00:00-04:00', 'Lincoln Financial Field, Filadelfia', 'pendiente');

-- Verificación rápida (debe devolver 6 grupos x 6 = 36 filas)
-- SELECT grupo, count(*) FROM partidos WHERE fase='grupos' AND grupo IN ('G','H','I','J','K','L') GROUP BY grupo ORDER BY grupo;

COMMIT;
