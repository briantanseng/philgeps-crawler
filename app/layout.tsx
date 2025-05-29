import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PhilGEPS Opportunity Search',
  description: 'Search and browse Philippine Government Electronic Procurement System opportunities',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <header className="bg-primary-900 text-white p-6">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-center">PhilGEPS Opportunity Search</h1>
          </div>
        </header>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}