'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MarketingLandingPage } from '@/components/pages/MarketingLandingPage'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, session, profile } = useAuth()

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // Strict authentication check - require user, valid session AND user profile
  // Also check if session is not expired
  const isSessionValid = session && session.expires_at && new Date(session.expires_at * 1000) > new Date()
  
  if (!user || !session || !isSessionValid || !profile) {
    return <MarketingLandingPage />
  }

  // User is authenticated, show the main app
  return <>{children}</>
}