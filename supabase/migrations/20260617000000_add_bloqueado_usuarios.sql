-- Bloqueo de participantes por el administrador.
-- Un usuario bloqueado conserva su PIN y sus datos, pero no puede iniciar
-- sesión (unirse de nuevo) hasta que el admin lo desbloquee.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT false;
