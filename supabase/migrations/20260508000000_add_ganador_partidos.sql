-- Agrega columna ganador para resolver el bracket automáticamente.
-- En eliminatorias con empate (va a penales), el admin indica el ganador manualmente.
-- Para victorias claras se auto-completa desde el servidor.
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS ganador VARCHAR(50);
