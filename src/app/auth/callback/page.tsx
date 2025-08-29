'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse URL fragment to get tokens (fragments are only available client-side)
        const fragment = window.location.hash.substring(1) // Remove #
        const params = new URLSearchParams(fragment)
        
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        const type = params.get('type')
        
        if (!access_token) {
          setError('Missing authentication token')
          setLoading(false)
          // Redirect to auth page after a delay
          setTimeout(() => router.push('/auth?error=invalid_token'), 2000)
          return
        }

        // Send tokens to server-side handler
        const response = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token,
            refresh_token,
            type
          })
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          setError(result.error || 'Authentication failed')
          setLoading(false)
          // Redirect to auth page after a delay
          setTimeout(() => router.push(`/auth?error=${result.error || 'authentication_failed'}`), 2000)
          return
        }

        // Success - redirect to appropriate page
        router.push(result.redirectUrl || '/')

      } catch (error) {
        console.error('Callback error:', error)
        setError('Unexpected error occurred')
        setLoading(false)
        setTimeout(() => router.push('/auth?error=unexpected_error'), 2000)
      }
    }

    handleCallback()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Verifying your account...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Authentication Error</p>
            <p>{error}</p>
          </div>
          <p className="text-white">Redirecting to login page...</p>
        </div>
      </div>
    )
  }

  return null
}