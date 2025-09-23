'use client'

import React, { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import { MarketingLandingPage } from '@/components/pages/MarketingLandingPage'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, authOperationLoading, session, profile } = useAuth()
  const pathname = usePathname()

  // Strict authentication check - require user, valid session AND user profile
  // Also check if session is not expired
  const isSessionValid = session && session.expires_at && new Date(session.expires_at * 1000) > new Date()
  const isAuthenticated = user && session && isSessionValid && profile

  // Check if current path is an auth-related page that shouldn't be redirected
  const isAuthPage = pathname?.startsWith('/auth')

  // Memoize MarketingLandingPage to prevent re-creation during authentication attempts
  // This preserves component state (modal, errors) when auth state changes
  const landingPage = useMemo(() => <MarketingLandingPage />, [])

  // Show loading spinner only during initial authentication check
  // Do NOT show loading during authentication operations (login/signup attempts)
  // to prevent unmounting MarketingLandingPage and losing error states
  if (loading && !authOperationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated, show the main app
  if (isAuthenticated) {
    return <>{children}</>
  }

  // If user is NOT authenticated:
  // - If they're on an auth page, let them stay there (don't redirect)
  // - If they're on a protected route, redirect to MarketingLandingPage
  if (isAuthPage) {
    // User is on an auth page, let them see it (including error messages)
    return <>{children}</>
  }

  // User is not authenticated and trying to access a protected route
  return landingPage
}