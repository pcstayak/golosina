'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AuthModal } from '../../components/auth/AuthModal'
import { Button } from '../../components/ui/Button'

export default function AuthPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const error = searchParams.get('error')
    
    if (error) {
      switch (error) {
        case 'invalid_token':
          setErrorMessage('The verification link is invalid or has expired.')
          break
        case 'configuration_error':
          setErrorMessage('Authentication service is not properly configured.')
          break
        case 'authentication_failed':
          setErrorMessage('Authentication failed. Please try again.')
          break
        case 'user_not_found':
          setErrorMessage('User account could not be found.')
          break
        case 'unexpected_error':
          setErrorMessage('An unexpected error occurred. Please try again.')
          break
        default:
          setErrorMessage('An authentication error occurred.')
      }
    }
  }, [searchParams])

  const handleModalClose = () => {
    setShowAuthModal(false)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-red-800 font-semibold">Authentication Error</h3>
            </div>
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
        )}
        
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
            {errorMessage ? 'Try Again' : 'Get Started'}
          </button>
          <p className="text-white/70 text-sm">
            Start your voice training journey today
          </p>
        </div>
      </div>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleModalClose}
        initialMode="login"
      />
    </div>
  )
}