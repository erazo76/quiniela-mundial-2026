export interface Partido {
  id: string
  equipo_local: string
  equipo_visitante: string
  bandera_local: string | null
  bandera_visitante: string | null
  fase: string
  grupo: string | null
  fecha_hora: string
  resultado_local: number | null
  resultado_visitante: number | null
  estado: string
  sede: string | null
  ganador: string | null
  penales_local: number | null
  penales_visitante: number | null
  prediccion?: Prediccion
}

export interface Prediccion {
  id: string
  usuario_id: string
  partido_id: string
  goles_local: number
  goles_visitante: number
  fichas_apostadas: number
  ganancia_fichas: number
  tipo_acierto: string | null
  acertado: boolean
}

export interface Usuario {
  id: string
  nombre: string
  liga_id: string
  fichas: number
  racha: number
  bono_usado: boolean
}
