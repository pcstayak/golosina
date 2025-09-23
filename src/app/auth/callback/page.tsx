'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Auth callback started')
        console.log('Current URL:', window.location.href)
        console.log('URL search params:', window.location.search)
        console.log('URL fragments:', window.location.hash)
        
        if (!supabase) {
          console.error('Supabase not configured')
          setError('Configuration error')
          setLoading(false)
          setTimeout(() => router.push('/auth?error=configuration_error'), 2000)
          return
        }

        // Handle different types of auth callbacks
        const urlParams = new URLSearchParams(window.location.search)
        const urlFragment = window.location.hash.substring(1)
        const fragmentParams = new URLSearchParams(urlFragment)
        
        let currentSession = null
        let currentUser = null

        // Check if this is an OAuth callback (tokens in URL fragment)
        if (fragmentParams.has('access_token')) {
          console.log('Handling OAuth callback with URL fragments')
          
          const access_token = fragmentParams.get('access_token')
          const refresh_token = fragmentParams.get('refresh_token')
          const token_type = fragmentParams.get('token_type') || 'bearer'
          const expires_in = fragmentParams.get('expires_in')
          
          if (!access_token) {
            console.error('Missing access token in OAuth callback')
            setError('Missing authentication token')
            setLoading(false)
            setTimeout(() => router.push('/auth?error=invalid_token'), 2000)
            return
          }

          console.log('Setting OAuth session with tokens:', { 
            access_token: access_token.substring(0, 10) + '...', 
            has_refresh_token: !!refresh_token,
            token_type,
            expires_in
          })

          // Set the session using the tokens
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || ''
          })

          if (setSessionError) {
            console.error('Error setting OAuth session:', setSessionError)
            
            // Try to recover by getting the user directly with the access token
            if (setSessionError.message?.includes('Invalid token')) {
              console.log('Attempting to refresh session after invalid token error')
              try {
                const { data: { user }, error: getUserError } = await supabase.auth.getUser(access_token)
                if (getUserError || !user) {
                  console.error('Failed to get user with access token:', getUserError)
                  setError('Failed to authenticate with OAuth provider')
                  setLoading(false)
                  setTimeout(() => router.push('/auth?error=oauth_token_invalid'), 2000)
                  return
                }
                
                // User exists, try getting the session again
                const { data: retrySessionData, error: retryError } = await supabase.auth.getSession()
                if (retryError || !retrySessionData.session) {
                  console.error('Failed to establish session after getting user:', retryError)
                  setError('Session establishment failed')
                  setLoading(false)
                  setTimeout(() => router.push('/auth?error=session_failed'), 2000)
                  return
                }
                
                currentSession = retrySessionData.session
                currentUser = retrySessionData.session.user
              } catch (recoveryError) {
                console.error('Failed to recover from OAuth token error:', recoveryError)
                setError('OAuth authentication failed')
                setLoading(false)
                setTimeout(() => router.push('/auth?error=oauth_recovery_failed'), 2000)
                return
              }
            } else {
              setError('Failed to authenticate')
              setLoading(false)
              setTimeout(() => router.push('/auth?error=authentication_failed'), 2000)
              return
            }
          } else if (!sessionData.session) {
            console.error('No session data returned from setSession')
            setError('Failed to establish session')
            setLoading(false)
            setTimeout(() => router.push('/auth?error=no_session'), 2000)
            return
          } else {
            currentSession = sessionData.session
            currentUser = sessionData.user
            
            console.log('OAuth session established successfully:', {
              user_id: currentUser?.id,
              email: currentUser?.email,
              provider: currentUser?.app_metadata?.provider
            })
          }
        }
        // Check if this is an email verification callback (code in query params)
        else if (urlParams.has('code')) {
          console.log('Handling email verification callback with authorization code')
          
          const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(urlParams.get('code')!)
          
          if (exchangeError || !sessionData.session) {
            console.error('Error exchanging code for session:', exchangeError)
            setError('Email verification failed')
            setLoading(false)
            setTimeout(() => router.push('/auth?error=email_verification_failed'), 2000)
            return
          }

          currentSession = sessionData.session
          currentUser = sessionData.user
        }
        // Fall back to checking existing session
        else {
          console.log('Checking for existing session')
          
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('Session error:', sessionError)
            setError('Authentication failed')
            setLoading(false)
            setTimeout(() => router.push('/auth?error=session_error'), 2000)
            return
          }
          
          currentSession = sessionData?.session
          currentUser = sessionData?.session?.user
        }

        if (!currentSession || !currentUser) {
          console.error('No valid session or user found', {
            has_session: !!currentSession,
            has_user: !!currentUser,
            session_user_id: currentSession?.user?.id,
            user_id: currentUser?.id
          })
          setError('Authentication failed')
          setLoading(false)
          setTimeout(() => router.push('/auth?error=authentication_failed'), 2000)
          return
        }

        console.log('Session and user validated successfully', {
          user_id: currentUser.id,
          email: currentUser.email,
          provider: currentUser.app_metadata?.provider,
          session_expires_at: currentSession.expires_at
        })

        // Check for OAuth user profile setup
        const isOAuthUser = currentUser.app_metadata?.provider !== 'email'
        let needsProfileSetup = false
        let userProfile = null
        
        // Always check if user has a profile, regardless of auth method
        console.log('Checking for user profile...')
        const { data: initialProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('Error fetching user profile:', profileError)
          // Don't fail here - the user might still be created by the trigger
        }
        
        let profile = initialProfile
        userProfile = profile
        
        if (isOAuthUser) {
          console.log('OAuth user detected, profile status:', { 
            has_profile: !!profile,
            profile_completion: profile?.profile_completion
          })
          
          if (!profile) {
            console.log('OAuth user has no profile - waiting for database trigger to complete...')
            // Wait a moment and try again - the trigger might still be creating the profile
            await new Promise(resolve => setTimeout(resolve, 1000))

            const { data: retryProfile, error: retryError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', currentUser.id)
              .maybeSingle()

            if (retryError) {
              console.error('Error on profile retry:', retryError)
              needsProfileSetup = true
            } else if (retryProfile) {
              console.log('Profile found on retry:', retryProfile)
              userProfile = retryProfile
              profile = retryProfile
            } else {
              console.log('No profile found after retry - profile setup will be needed')
              needsProfileSetup = true
            }
          }
          
          // For OAuth users, we might need additional profile setup even if basic profile exists
          if (profile && profile.profile_completion === 'incomplete') {
            needsProfileSetup = true
          }
        } else {
          // For email users, missing profile indicates incomplete registration
          if (!profile) {
            console.log('Email user without profile - incomplete registration')
            setError('Account setup incomplete')
            setLoading(false)
            setTimeout(() => router.push('/auth?error=incomplete_registration'), 2000)
            return
          }
        }

        // Determine redirect based on callback type
        const type = urlParams.get('type')
        
        let redirectUrl = '/'
        
        switch (type) {
          case 'signup':
            redirectUrl = `/auth/verify-email?verified=true&user_id=${currentUser.id}`
            break
          case 'recovery':
            redirectUrl = '/auth/reset-password'
            break
          default:
            // For OAuth users who need profile setup, redirect to main app
            redirectUrl = needsProfileSetup ? '/?setup=profile' : '/'
        }

        console.log(`Authentication successful for user ${currentUser.id}, redirecting to: ${redirectUrl}`)
        
        // Success - redirect to appropriate page
        router.push(redirectUrl)

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