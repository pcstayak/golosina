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
  signUp: (data: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
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
  const [loading, setLoading] = useState(true)

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
          
          // If user exists but no profile, sign them out (incomplete registration)
          if (!profile) {
            console.log('User exists but no profile found - signing out incomplete session')
            await AuthService.logout()
            setUser(null)
            setSession(null)
            setProfile(null)
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
          
          // If user exists but no profile, sign them out (incomplete registration)
          if (!profile) {
            console.log('User exists but no profile found - signing out incomplete session')
            await AuthService.logout()
            setUser(null)
            setSession(null)
            setProfile(null)
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
    setLoading(true)
    try {
      const result = await AuthService.register(data)
      if (result.success && result.user) {
        const profile = await AuthService.getUserProfile(result.user.id)
        setProfile(profile)
      }
      return result
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const result = await AuthService.login({ email, password })
      if (result.success && result.user) {
        const profile = await AuthService.getUserProfile(result.user.id)
        setProfile(profile)
      }
      return result
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const result = await AuthService.logout()
      if (result.success) {
        setUser(null)
        setSession(null)
        setProfile(null)
      }
      return result
    } finally {
      setLoading(false)
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
    signUp,
    signIn,
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