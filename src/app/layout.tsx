import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Golosina - AI-Powered Voice Training | Master Your Voice with Real-Time Feedback',
  description: 'Transform your voice with AI-powered training. Perfect for singers, speakers, and performers. Get real-time feedback, personalized exercises, and track your progress. Start free today!',
  keywords: [
    'voice training',
    'AI voice coach', 
    'singing lessons',
    'speech training',
    'vocal exercises',
    'pitch training',
    'breathing techniques',
    'voice improvement',
    'vocal coaching',
    'real-time feedback',
    'voice analysis',
    'speech therapy',
    'presentation skills',
    'public speaking',
    'vocal range',
    'voice lessons online'
  ],
  authors: [{ name: 'Golosina' }],
  creator: 'Golosina',
  publisher: 'Golosina',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://golosina.net'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Golosina - AI-Powered Voice Training | Master Your Voice',
    description: 'Transform your voice with AI-powered training. Perfect for singers, speakers, and performers. Get real-time feedback and personalized exercises.',
    url: 'https://golosina.net',
    siteName: 'Golosina',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Golosina - AI-Powered Voice Training Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Golosina - AI-Powered Voice Training',
    description: 'Transform your voice with AI-powered training. Real-time feedback, personalized exercises, and progress tracking.',
    images: ['/twitter-image.jpg'],
    creator: '@golosina',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
    other: {
      bing: ['bing-site-verification-code'],
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div id="app">
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}