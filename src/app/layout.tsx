import type { Metadata } from 'next'
import { Exo_2 } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-exo2',
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'Quiniela Mundial 2026',
  description: 'Predecí los partidos, apostá fichas y ganá el pote con tu grupo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${exo2.variable} h-full`}>
      <body className="min-h-full bg-slate-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
