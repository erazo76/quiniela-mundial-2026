-- Correccion dieciseisavos: 18 partidos erroneos → 16 oficiales FIFA 2026
-- Ejecutar en Supabase SQL Editor

DELETE FROM partidos WHERE fase = 'dieciseisavos';

INSERT INTO partidos (equipo_local, equipo_visitante, fase, grupo, fecha_hora, sede, estado)
VALUES
  ('1E', '3°(ABCDF)', 'dieciseisavos', NULL, '2026-06-28T19:00:00-04:00', 'MetLife Stadium, Nueva York/Nueva Jersey', 'pendiente'),
  ('1I', '3°(CDFGH)', 'dieciseisavos', NULL, '2026-06-28T23:00:00-04:00', 'Mercedes-Benz Stadium, Atlanta', 'pendiente'),
  ('2A', '2B', 'dieciseisavos', NULL, '2026-06-29T15:00:00-05:00', 'NRG Stadium, Houston', 'pendiente'),
  ('1F', '2C', 'dieciseisavos', NULL, '2026-06-29T19:00:00-04:00', 'Gillette Stadium, Boston', 'pendiente'),
  ('2K', '2L', 'dieciseisavos', NULL, '2026-06-30T15:00:00-07:00', 'BC Place, Vancouver', 'pendiente'),
  ('1H', '2J', 'dieciseisavos', NULL, '2026-06-30T19:00:00-05:00', 'AT&T Stadium, Arlington', 'pendiente'),
  ('1D', '3°(BEFIJ)', 'dieciseisavos', NULL, '2026-07-01T15:00:00-04:00', 'Hard Rock Stadium, Miami', 'pendiente'),
  ('1G', '3°(AEHIJ)', 'dieciseisavos', NULL, '2026-07-01T19:00:00-04:00', 'BMO Field, Toronto', 'pendiente'),
  ('1C', '2F', 'dieciseisavos', NULL, '2026-07-02T15:00:00-05:00', 'Arrowhead Stadium, Kansas City', 'pendiente'),
  ('2E', '2I', 'dieciseisavos', NULL, '2026-07-02T19:00:00-04:00', 'Lincoln Financial Field, Filadelfia', 'pendiente'),
  ('1A', '3°(CEFHI)', 'dieciseisavos', NULL, '2026-07-03T15:00:00-07:00', 'SoFi Stadium, Los Ángeles', 'pendiente'),
  ('1L', '3°(EHIJK)', 'dieciseisavos', NULL, '2026-07-03T19:00:00-05:00', 'Estadio Azteca, Ciudad de México', 'pendiente'),
  ('1J', '2H', 'dieciseisavos', NULL, '2026-07-04T15:00:00-04:00', 'Gillette Stadium, Boston', 'pendiente'),
  ('2D', '2G', 'dieciseisavos', NULL, '2026-07-04T19:00:00-05:00', 'NRG Stadium, Houston', 'pendiente'),
  ('1B', '3°(EFGIJ)', 'dieciseisavos', NULL, '2026-07-05T15:00:00-04:00', 'MetLife Stadium, Nueva York/Nueva Jersey', 'pendiente'),
  ('1K', '3°(DEIJL)', 'dieciseisavos', NULL, '2026-07-05T19:00:00-07:00', 'Lumen Field, Seattle', 'pendiente');