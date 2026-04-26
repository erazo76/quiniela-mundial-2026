import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Quiniela Mundial 2026'

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '60px',
      }}
    >
      {/* Icono */}
      <div style={{ fontSize: 120, lineHeight: 1 }}>⚽</div>

      {/* Título */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: 'white',
          textAlign: 'center',
          lineHeight: 1.1,
          letterSpacing: '-2px',
        }}
      >
        Quiniela Mundial 2026
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 32,
          color: '#94a3b8',
          textAlign: 'center',
        }}
      >
        Predice · Gana fichas · Compite con tus amigos
      </div>

      {/* Decoración verde */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #22c55e, #16a34a)',
        }}
      />
    </div>,
    { ...size }
  )
}
