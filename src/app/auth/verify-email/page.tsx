'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthService } from '../../../lib/auth'
import { EmailVerificationSuccess } from '../../../components/auth/EmailVerificationSuccess'
import { Button } from '../../../components/ui/Button'

// Component that uses useSearchParams - needs to be wrapped in Suspense
function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const handleVerification = async () => {
      const token = searchParams.get('token')
      const verified = searchParams.get('verified')
      const user_id = searchParams.get('user_id')

      // If already verified via callback, just get user profile
      if (verified === 'true' && user_id) {
        try {
          const profile = await AuthService.getUserProfile(user_id)
          setUserRole(profile?.role || 'student')
          setStatus('success')
        } catch (error) {
          console.error('Error fetching user profile:', error)
          setStatus('error')
          setError('Failed to load user profile')
        }
        return
      }

      // Legacy token-based verification
      if (!token) {
        setStatus('error')
        setError('Invalid verification link')
        return
      }

      try {
        const result = await AuthService.verifyEmailToken(token)
        
        if (result.success && result.user) {
          // Get user profile to determine role
          const profile = await AuthService.getUserProfile(result.user.id)
          setUserRole(profile?.role || 'student')
          setStatus('success')
        } else {
          setStatus('error')
          setError(result.error || 'Email verification failed')
        }
      } catch (error) {
        console.error('Email verification error:', error)
        setStatus('error')
        setError('An unexpected error occurred')
      }
    }

    handleVerification()
  }, [searchParams])

  const handleContinueToApp = () => {
    router.push('/')
  }

  const handleSkipProfileSetup = () => {
    router.push('/')
  }

  const handleRetryVerification = () => {
    window.location.reload()
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verifying your email</h1>
            <p className="text-gray-600 mt-2">Please wait while we confirm your email address...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verification failed</h1>
            <p className="text-gray-600 mt-2">{error}</p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleRetryVerification} className="w-full">
              Try again
            </Button>
            
            <Button 
              onClick={() => router.push('/auth')} 
              variant="secondary" 
              className="w-full"
            >
              Back to sign in
            </Button>
          </div>

          <div className="text-sm text-gray-500">
            <p>Need help? Contact support at support@{typeof window !== 'undefined' ? window.location.hostname : 'golosina.app'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <EmailVerificationSuccess
        userRole={userRole}
        onContinueToApp={handleContinueToApp}
        onSkipProfileSetup={handleSkipProfileSetup}
      />
    </div>
  )
}

// Loading fallback component
function VerifyEmailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verifying your email</h1>
          <p className="text-gray-600 mt-2">Please wait while we confirm your email address...</p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  )
}