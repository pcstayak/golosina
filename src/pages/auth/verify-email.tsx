import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AuthService } from '../../lib/auth'
import { EmailVerificationSuccess } from '../../components/auth/EmailVerificationSuccess'
import { Button } from '../../components/ui/Button'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const verifyEmail = async () => {
      const { token } = router.query

      if (!token || typeof token !== 'string') {
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

    if (router.isReady) {
      verifyEmail()
    }
  }, [router.isReady, router.query])

  const handleContinueToProfile = () => {
    router.push('/profile/setup')
  }

  const handleContinueToDashboard = () => {
    router.push('/dashboard')
  }

  const handleRetryVerification = () => {
    router.reload()
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
            <p>Need help? Contact support at support@{window.location.hostname}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <EmailVerificationSuccess
        userRole={userRole}
        onContinueToProfile={handleContinueToProfile}
        onContinueToDashboard={handleContinueToDashboard}
      />
    </div>
  )
}