-- Ligas privadas
CREATE TABLE ligas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_invitacion VARCHAR(6) UNIQUE NOT NULL,
  nombre_liga VARCHAR(100),
  pote_virtual INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usuarios (auth anónima — sin email)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) NOT NULL,
  liga_id UUID REFERENCES ligas(id),
  fichas INTEGER DEFAULT 1000,
  racha INTEGER DEFAULT 0,
  bono_usado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Partidos del mundial (96 en total)
CREATE TABLE partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_local VARCHAR(50),
  equipo_visitante VARCHAR(50),
  bandera_local TEXT,
  bandera_visitante TEXT,
  fase VARCHAR(20),
  grupo VARCHAR(5),
  fecha_hora TIMESTAMP WITH TIME ZONE,
  resultado_local INTEGER,
  resultado_visitante INTEGER,
  estado VARCHAR(20) DEFAULT 'pendiente'
);

-- Predicciones con apuesta de fichas
CREATE TABLE predicciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  partido_id UUID REFERENCES partidos(id) ON DELETE CASCADE,
  goles_local INTEGER NOT NULL CHECK (goles_local >= 0),
  goles_visitante INTEGER NOT NULL CHECK (goles_visitante >= 0),
  fichas_apostadas INTEGER NOT NULL CHECK (fichas_apostadas >= 10),
  ganancia_fichas INTEGER DEFAULT 0,
  tipo_acierto VARCHAR(20),
  acertado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (usuario_id, partido_id)
);

-- Historial de movimientos de fichas
CREATE TABLE historial_fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  cantidad INTEGER NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Info estática de equipos
CREATE TABLE info_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_pais VARCHAR(50) UNIQUE NOT NULL,
  codigo_pais VARCHAR(3),
  bandera_url TEXT,
  mapa_svg TEXT,
  mejor_puesto_mundial VARCHAR(50),
  participaciones INTEGER DEFAULT 0,
  figura_clave_nombre VARCHAR(100),
  figura_clave_avatar TEXT,
  dato_freak_1 TEXT,
  dato_freak_2 TEXT,
  dato_freak_3 TEXT
);

-- Sesiones de admin
CREATE TABLE admin_sessions (
  token VARCHAR(64) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX idx_predicciones_usuario ON predicciones(usuario_id);
CREATE INDEX idx_predicciones_partido ON predicciones(partido_id);
CREATE INDEX idx_historial_usuario ON historial_fichas(usuario_id);
CREATE INDEX idx_partidos_estado ON partidos(estado);
CREATE INDEX idx_partidos_fecha ON partidos(fecha_hora);
CREATE INDEX idx_usuarios_liga ON usuarios(liga_id);

-- RLS: habilitar en todas las tablas
ALTER TABLE ligas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE info_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Partidos: lectura pública
CREATE POLICY "partidos_lectura_publica" ON partidos
  FOR SELECT USING (true);

-- Info equipos: lectura pública
CREATE POLICY "info_equipos_lectura_publica" ON info_equipos
  FOR SELECT USING (true);

-- Ligas: lectura pública (para unirse con código)
CREATE POLICY "ligas_lectura_publica" ON ligas
  FOR SELECT USING (true);

CREATE POLICY "ligas_insertar" ON ligas
  FOR INSERT WITH CHECK (true);

-- Usuarios: lectura pública (para el ranking)
CREATE POLICY "usuarios_lectura_publica" ON usuarios
  FOR SELECT USING (true);

CREATE POLICY "usuarios_insertar" ON usuarios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "usuarios_actualizar_propio" ON usuarios
  FOR UPDATE USING (id = (current_setting('app.usuario_id', true))::UUID);

-- Predicciones: cada usuario ve y crea solo las suyas
CREATE POLICY "predicciones_lectura_propia" ON predicciones
  FOR SELECT USING (usuario_id = (current_setting('app.usuario_id', true))::UUID);

CREATE POLICY "predicciones_insertar" ON predicciones
  FOR INSERT WITH CHECK (usuario_id = (current_setting('app.usuario_id', true))::UUID);

-- Historial: cada usuario ve solo el suyo
CREATE POLICY "historial_lectura_propio" ON historial_fichas
  FOR SELECT USING (usuario_id = (current_setting('app.usuario_id', true))::UUID);
