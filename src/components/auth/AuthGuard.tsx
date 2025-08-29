'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from './AuthModal'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, session, profile } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

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
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to Golosina
            </h1>
            <p className="text-white/90 text-lg mb-8">
              Your AI-powered voice training assistant with real-time feedback and progress tracking
            </p>
            <div className="space-y-4">
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Get Started
              </button>
              <p className="text-white/70 text-sm">
                Start your voice training journey today
              </p>
            </div>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="login"
        />
      </>
    )
  }

  // User is authenticated, show the main app
  return <>{children}</>
}