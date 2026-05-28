import type { Metadata, Viewport } from 'next'
import { Exo_2 } from 'next/font/google'
import Image from 'next/image'
import './globals.css'
import { Providers } from '@/components/Providers'

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-exo2',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const APP_URL = 'https://quiniela-mundial-2026-nine.vercel.app'
const TITLE = 'Quiniela Mundial 2026'
const DESCRIPTION = 'Predice los partidos del Mundial FIFA 2026, gana fichas y compite con tus amigos.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Quiniela 2026',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    siteName: TITLE,
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Quiniela 2026',
  },
}

export const viewport: Viewport = {
  themeColor: '#22c55e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${exo2.variable} h-full`}>
      <body className="min-h-full text-white antialiased">
        {/* Fondo global fijo — visible en todas las vistas */}
        <div className="fixed inset-0 -z-10 pointer-events-none select-none">
          <Image
            src="/ui/background.jpg"
            alt=""
            fill
            className="object-cover object-top"
            unoptimized
            priority
          />
          <div className="absolute inset-0" style={{ background: 'rgba(2,6,23,0.68)' }} />
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
