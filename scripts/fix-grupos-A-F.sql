-- ============================================================================
-- CORRECCIÓN GRUPOS A–F · Mundial 2026 (horarios + orientación local/visitante)
-- Fuente: artículos oficiales por grupo (Wikipedia, con offset UTC exacto),
-- cruzados con ESPN/Yahoo. Equipos y sedes ya eran correctos.
-- Los cambios de hora NO invalidan predicciones (mismo cruce) => solo UPDATE.
-- Los 3 swaps local/visitante PRESERVAN la predicción invirtiendo los goles.
-- Ejecutar UNA vez en SQL Editor de Supabase, con backup. Todo en una transacción.
-- ============================================================================
BEGIN;

-- (1) Ajustes de horario (mismo cruce, sin tocar predicciones)
UPDATE partidos SET fecha_hora='2026-06-11T20:00:00-06:00' WHERE fase='grupos' AND grupo='A' AND equipo_local='Corea del Sur' AND equipo_visitante='República Checa';
UPDATE partidos SET fecha_hora='2026-06-18T12:00:00-04:00' WHERE fase='grupos' AND grupo='A' AND equipo_local='República Checa' AND equipo_visitante='Sudáfrica';
UPDATE partidos SET fecha_hora='2026-06-13T12:00:00-07:00' WHERE fase='grupos' AND grupo='B' AND equipo_local='Catar' AND equipo_visitante='Suiza';
UPDATE partidos SET fecha_hora='2026-06-18T12:00:00-07:00' WHERE fase='grupos' AND grupo='B' AND equipo_local='Suiza' AND equipo_visitante='Bosnia y Herzegovina';
UPDATE partidos SET fecha_hora='2026-06-18T15:00:00-07:00' WHERE fase='grupos' AND grupo='B' AND equipo_local='Canadá' AND equipo_visitante='Catar';
UPDATE partidos SET fecha_hora='2026-06-24T12:00:00-07:00' WHERE fase='grupos' AND grupo='B' AND equipo_local='Bosnia y Herzegovina' AND equipo_visitante='Catar';
UPDATE partidos SET fecha_hora='2026-06-13T21:00:00-04:00' WHERE fase='grupos' AND grupo='C' AND equipo_local='Haití' AND equipo_visitante='Escocia';
UPDATE partidos SET fecha_hora='2026-06-19T20:30:00-04:00' WHERE fase='grupos' AND grupo='C' AND equipo_local='Brasil' AND equipo_visitante='Haití';
UPDATE partidos SET fecha_hora='2026-06-19T18:00:00-04:00' WHERE fase='grupos' AND grupo='C' AND equipo_local='Escocia' AND equipo_visitante='Marruecos';
UPDATE partidos SET fecha_hora='2026-06-24T18:00:00-04:00' WHERE fase='grupos' AND grupo='C' AND equipo_local='Escocia' AND equipo_visitante='Brasil';
UPDATE partidos SET fecha_hora='2026-06-24T18:00:00-04:00' WHERE fase='grupos' AND grupo='C' AND equipo_local='Marruecos' AND equipo_visitante='Haití';
UPDATE partidos SET fecha_hora='2026-06-13T21:00:00-07:00' WHERE fase='grupos' AND grupo='D' AND equipo_local='Australia' AND equipo_visitante='Turquía';
UPDATE partidos SET fecha_hora='2026-06-19T20:00:00-07:00' WHERE fase='grupos' AND grupo='D' AND equipo_local='Turquía' AND equipo_visitante='Paraguay';
UPDATE partidos SET fecha_hora='2026-06-19T12:00:00-07:00' WHERE fase='grupos' AND grupo='D' AND equipo_local='Estados Unidos' AND equipo_visitante='Australia';
UPDATE partidos SET fecha_hora='2026-06-25T19:00:00-07:00' WHERE fase='grupos' AND grupo='D' AND equipo_local='Paraguay' AND equipo_visitante='Australia';
UPDATE partidos SET fecha_hora='2026-06-14T19:00:00-04:00' WHERE fase='grupos' AND grupo='E' AND equipo_local='Costa de Marfil' AND equipo_visitante='Ecuador';
UPDATE partidos SET fecha_hora='2026-06-20T16:00:00-04:00' WHERE fase='grupos' AND grupo='E' AND equipo_local='Alemania' AND equipo_visitante='Costa de Marfil';
UPDATE partidos SET fecha_hora='2026-06-20T19:00:00-05:00' WHERE fase='grupos' AND grupo='E' AND equipo_local='Ecuador' AND equipo_visitante='Curazao';
UPDATE partidos SET fecha_hora='2026-06-25T16:00:00-04:00' WHERE fase='grupos' AND grupo='E' AND equipo_local='Ecuador' AND equipo_visitante='Alemania';
UPDATE partidos SET fecha_hora='2026-06-25T16:00:00-04:00' WHERE fase='grupos' AND grupo='E' AND equipo_local='Curazao' AND equipo_visitante='Costa de Marfil';
UPDATE partidos SET fecha_hora='2026-06-14T15:00:00-05:00' WHERE fase='grupos' AND grupo='F' AND equipo_local='Países Bajos' AND equipo_visitante='Japón';
UPDATE partidos SET fecha_hora='2026-06-14T20:00:00-06:00' WHERE fase='grupos' AND grupo='F' AND equipo_local='Suecia' AND equipo_visitante='Túnez';
UPDATE partidos SET fecha_hora='2026-06-25T18:00:00-05:00' WHERE fase='grupos' AND grupo='F' AND equipo_local='Japón' AND equipo_visitante='Suecia';
UPDATE partidos SET fecha_hora='2026-06-25T18:00:00-05:00' WHERE fase='grupos' AND grupo='F' AND equipo_local='Túnez' AND equipo_visitante='Países Bajos';

-- (2) Inversión local/visitante (3 partidos). Se invierten los goles de las
--     predicciones existentes para preservar la intención del usuario,
--     luego se reorienta el partido (equipos, banderas y hora oficial).
--   A: México vs República Checa  ->  República Checa vs México
UPDATE predicciones pr SET goles_local = pr.goles_visitante, goles_visitante = pr.goles_local
  FROM partidos pa WHERE pa.id = pr.partido_id AND pa.fase='grupos' AND pa.grupo='A' AND pa.equipo_local='México' AND pa.equipo_visitante='República Checa';
UPDATE partidos SET equipo_local='República Checa', equipo_visitante='México', bandera_local='/flags/cz.png', bandera_visitante='/flags/mx.png', fecha_hora='2026-06-24T19:00:00-06:00'
  WHERE fase='grupos' AND grupo='A' AND equipo_local='México' AND equipo_visitante='República Checa';
--   B: Canadá vs Suiza  ->  Suiza vs Canadá
UPDATE predicciones pr SET goles_local = pr.goles_visitante, goles_visitante = pr.goles_local
  FROM partidos pa WHERE pa.id = pr.partido_id AND pa.fase='grupos' AND pa.grupo='B' AND pa.equipo_local='Canadá' AND pa.equipo_visitante='Suiza';
UPDATE partidos SET equipo_local='Suiza', equipo_visitante='Canadá', bandera_local='/flags/ch.png', bandera_visitante='/flags/ca.png', fecha_hora='2026-06-24T12:00:00-07:00'
  WHERE fase='grupos' AND grupo='B' AND equipo_local='Canadá' AND equipo_visitante='Suiza';
--   D: Estados Unidos vs Turquía  ->  Turquía vs Estados Unidos
UPDATE predicciones pr SET goles_local = pr.goles_visitante, goles_visitante = pr.goles_local
  FROM partidos pa WHERE pa.id = pr.partido_id AND pa.fase='grupos' AND pa.grupo='D' AND pa.equipo_local='Estados Unidos' AND pa.equipo_visitante='Turquía';
UPDATE partidos SET equipo_local='Turquía', equipo_visitante='Estados Unidos', bandera_local='/flags/tr.png', bandera_visitante='/flags/us.png', fecha_hora='2026-06-25T19:00:00-07:00'
  WHERE fase='grupos' AND grupo='D' AND equipo_local='Estados Unidos' AND equipo_visitante='Turquía';

COMMIT;
