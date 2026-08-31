-- usuarios.pin pasa de texto plano (4 dígitos) a hash bcrypt (60 caracteres).
-- La columna era VARCHAR(4) y no admite el hash.
--
-- No hay migración de datos: verificarPin() en src/lib/pin.ts acepta los PIN
-- heredados en texto plano y /api/unirse los reescribe como hash en el primer
-- login correcto de cada jugador.
ALTER TABLE usuarios ALTER COLUMN pin TYPE VARCHAR(255);
