import React from "react"
import type { Metadata } from 'next'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { ErrorBoundary } from '@/components/error-boundary'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'GigFlow - India\'s Professional Freelance Marketplace',
    template: '%s | GigFlow',
  },
  description: 'Connect with top Indian freelancers or find your next project. Post jobs, bid on projects, and build your career on GigFlow.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gigflow.in'),
  openGraph: {
    title: 'GigFlow - India\'s Professional Freelance Marketplace',
    description: 'Connect with top Indian freelancers or find your next project.',
    siteName: 'GigFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GigFlow - India\'s Professional Freelance Marketplace',
    description: 'Connect with top Indian freelancers or find your next project.',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${instrumentSerif.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
