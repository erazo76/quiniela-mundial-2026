import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quiniela Mundial 2026',
    short_name: 'Quiniela 2026',
    description: 'Predice los partidos del Mundial FIFA 2026, gana fichas y compite con tus amigos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#22c55e',
    orientation: 'portrait',
    icons: [
      { src: '/icon', sizes: '192x192', type: 'image/png' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
