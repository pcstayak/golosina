'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { AuthService } from '../lib/auth'
import { UserProfile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  authOperationLoading: boolean
  signUp: (data: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signOut: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
  updatePassword: (newPassword: string) => Promise<any>
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>
  resendConfirmation: (email: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true) // Initial app authentication check
  const [authOperationLoading, setAuthOperationLoading] = useState(false) // Active auth operations

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const session = await AuthService.getCurrentSession()
        const user = await AuthService.getCurrentUser()
        
        setSession(session)
        setUser(user)

        if (user) {
          const profile = await AuthService.getUserProfile(user.id)
          setProfile(profile)
          
          // If user exists but no profile, check if it's an OAuth user
          if (!profile) {
            // For OAuth users, we might need to create a basic profile
            const isOAuthUser = user.app_metadata?.provider !== 'email'
            
            if (isOAuthUser) {
              console.log('OAuth user without profile - creating basic profile')
              
              try {
                // Extract user data from OAuth metadata
                const displayName = user.user_metadata?.full_name || 
                                  user.user_metadata?.name || 
                                  `${user.user_metadata?.given_name || ''} ${user.user_metadata?.family_name || ''}`.trim() ||
                                  user.email?.split('@')[0]
                
                const firstName = user.user_metadata?.given_name || 
                                user.user_metadata?.first_name ||
                                (user.user_metadata?.full_name || '').split(' ')[0]
                
                const lastName = user.user_metadata?.family_name || 
                               user.user_metadata?.last_name ||
                               (user.user_metadata?.full_name || '').split(' ').slice(1).join(' ')
                
                const createResult = await AuthService.createOAuthUserProfile(user.id, {
                  email: user.email!,
                  firstName: firstName || null,
                  lastName: lastName || null,
                  displayName: displayName,
                  provider: user.app_metadata?.provider || 'unknown'
                })
                
                if (createResult.success) {
                  console.log('OAuth user profile created successfully')
                  const newProfile = await AuthService.getUserProfile(user.id)
                  setProfile(newProfile)
                } else {
                  console.error('Failed to create OAuth user profile:', createResult.error)
                  // Don't sign them out, let them proceed to complete setup manually
                }
              } catch (error) {
                console.error('Error creating OAuth user profile:', error)
                // Don't sign them out, let them proceed to complete setup manually
              }
            } else {
              // For email users, incomplete registration should sign them out
              console.log('Email user exists but no profile found - signing out incomplete session')
              await AuthService.logout()
              setUser(null)
              setSession(null)
              setProfile(null)
            }
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(async (session) => {
      try {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profile = await AuthService.getUserProfile(session.user.id)
          setProfile(profile)
          
          // If user exists but no profile, check if it's an OAuth user
          if (!profile) {
            // For OAuth users, we might need to create a basic profile
            const isOAuthUser = session.user.app_metadata?.provider !== 'email'
            
            if (isOAuthUser) {
              console.log('OAuth user without profile in auth state change - creating basic profile')
              
              try {
                // Extract user data from OAuth metadata
                const user = session.user
                const displayName = user.user_metadata?.full_name || 
                                  user.user_metadata?.name || 
                                  `${user.user_metadata?.given_name || ''} ${user.user_metadata?.family_name || ''}`.trim() ||
                                  user.email?.split('@')[0]
                
                const firstName = user.user_metadata?.given_name || 
                                user.user_metadata?.first_name ||
                                (user.user_metadata?.full_name || '').split(' ')[0]
                
                const lastName = user.user_metadata?.family_name || 
                               user.user_metadata?.last_name ||
                               (user.user_metadata?.full_name || '').split(' ').slice(1).join(' ')
                
                const createResult = await AuthService.createOAuthUserProfile(user.id, {
                  email: user.email!,
                  firstName: firstName || null,
                  lastName: lastName || null,
                  displayName: displayName,
                  provider: user.app_metadata?.provider || 'unknown'
                })
                
                if (createResult.success) {
                  console.log('OAuth user profile created successfully in auth state change')
                  const newProfile = await AuthService.getUserProfile(user.id)
                  setProfile(newProfile)
                } else {
                  console.error('Failed to create OAuth user profile in auth state change:', createResult.error)
                  // Don't sign them out, let them proceed to complete setup manually
                }
              } catch (error) {
                console.error('Error creating OAuth user profile in auth state change:', error)
                // Don't sign them out, let them proceed to complete setup manually
              }
            } else {
              // For email users, incomplete registration should sign them out
              console.log('Email user exists but no profile found - signing out incomplete session')
              await AuthService.logout()
              setUser(null)
              setSession(null)
              setProfile(null)
            }
          }
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (data: any) => {
    setAuthOperationLoading(true)
    try {
      const result = await AuthService.register(data)
      if (result.success && result.user) {
        const profile = await AuthService.getUserProfile(result.user.id)
        setProfile(profile)
      }
      return result
    } finally {
      setAuthOperationLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setAuthOperationLoading(true)
    try {
      const result = await AuthService.login({ email, password })
      if (result.success && result.user) {
        const profile = await AuthService.getUserProfile(result.user.id)
        setProfile(profile)
      }
      return result
    } finally {
      setAuthOperationLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setAuthOperationLoading(true)
    try {
      return await AuthService.signInWithGoogle()
    } finally {
      setAuthOperationLoading(false)
    }
  }

  const signOut = async () => {
    setAuthOperationLoading(true)
    try {
      const result = await AuthService.logout()
      if (result.success) {
        setUser(null)
        setSession(null)
        setProfile(null)
      }
      return result
    } finally {
      setAuthOperationLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    return await AuthService.resetPassword(email)
  }

  const updatePassword = async (newPassword: string) => {
    return await AuthService.updatePassword(newPassword)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return false

    const success = await AuthService.updateUserProfile(user.id, updates)
    if (success) {
      // Refresh profile data
      const updatedProfile = await AuthService.getUserProfile(user.id)
      setProfile(updatedProfile)
    }
    return success
  }

  const resendConfirmation = async (email: string) => {
    return await AuthService.resendConfirmationEmail(email)
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    authOperationLoading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    resendConfirmation
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}