ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS penales_local INT,
  ADD COLUMN IF NOT EXISTS penales_visitante INT;
