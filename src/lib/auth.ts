import { supabase, UserProfile, UserRole } from './supabase'
import { AuthError, User, Session } from '@supabase/supabase-js'
import { 
  checkRegistrationRateLimit, 
  recordRegistrationAttempt,
  checkLoginRateLimit,
  recordLoginAttempt,
  checkPasswordResetRateLimit,
  recordPasswordResetAttempt,
  checkEmailVerificationRateLimit,
  recordEmailVerificationAttempt,
  formatRemainingTime
} from './rateLimiting'
import { getAuthErrorMessage } from './authErrorTranslator'

// Utility function to get the correct site URL for email redirects
function getSiteUrl(): string {
  // If we're in the browser, use the current origin
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Server-side logic
  // Check for production environment variables first
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || process.env.SITE_URL

  if (siteUrl) {
    // Ensure HTTPS for production URLs (but not localhost)
    if (siteUrl.startsWith('http://') && !siteUrl.includes('localhost')) {
      return siteUrl.replace('http://', 'https://')
    }
    
    // If it's a Vercel URL without protocol, add https
    if (siteUrl.includes('.vercel.app') && !siteUrl.startsWith('http')) {
      return `https://${siteUrl}`
    }
    
    return siteUrl
  }

  // Default to localhost only in development
  return 'http://localhost:3000'
}

export interface AuthResponse {
  success: boolean
  error?: string
  user?: User
  session?: Session
}

export interface RegistrationData {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role: UserRole
  termsAccepted: boolean
  privacyPolicyAccepted: boolean
  marketingEmailsConsent?: boolean
}

export interface LoginData {
  email: string
  password: string
}

export class AuthService {
  static async register(data: RegistrationData): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Check rate limiting
      const rateLimitCheck = checkRegistrationRateLimit(data.email)
      if (rateLimitCheck.blocked) {
        const timeStr = rateLimitCheck.remainingTime ? formatRemainingTime(rateLimitCheck.remainingTime) : 'some time'
        return { success: false, error: `Too many registration attempts. Please try again in ${timeStr}.` }
      }

      // Validate required fields
      if (!data.email || !data.password) {
        recordRegistrationAttempt(data.email, false)
        return { success: false, error: 'Email and password are required' }
      }

      if (!data.termsAccepted || !data.privacyPolicyAccepted) {
        recordRegistrationAttempt(data.email, false)
        return { success: false, error: 'You must accept the terms of service and privacy policy' }
      }

      if (data.password.length < 8) {
        recordRegistrationAttempt(data.email, false)
        return { success: false, error: 'Password must be at least 8 characters long' }
      }

      // Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${getSiteUrl()}/api/auth/callback`,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role,
            terms_accepted: data.termsAccepted,
            privacy_policy_accepted: data.privacyPolicyAccepted,
            marketing_emails_consent: data.marketingEmailsConsent || false
          }
        }
      })

      if (authError) {
        recordRegistrationAttempt(data.email, false)
        const friendlyError = getAuthErrorMessage(authError.message, 'register')
        return { success: false, error: friendlyError }
      }

      if (!authData.user) {
        recordRegistrationAttempt(data.email, false)
        return { success: false, error: 'Failed to create user account' }
      }

      // Success - reset rate limiting
      recordRegistrationAttempt(data.email, true)

      // Log the registration event
      await this.logAuthEvent(
        authData.user.id,
        'register',
        null,
        null,
        { role: data.role },
        true
      )

      return {
        success: true,
        user: authData.user || undefined,
        session: authData.session || undefined
      }
    } catch (error) {
      console.error('Registration error:', error)
      recordRegistrationAttempt(data.email, false)
      return { success: false, error: 'An unexpected error occurred during registration' }
    }
  }

  static async login(data: LoginData): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Check rate limiting
      const rateLimitCheck = checkLoginRateLimit(data.email)
      if (rateLimitCheck.blocked) {
        const timeStr = rateLimitCheck.remainingTime ? formatRemainingTime(rateLimitCheck.remainingTime) : 'some time'
        return { success: false, error: `Too many login attempts. Please try again in ${timeStr}.` }
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
        recordLoginAttempt(data.email, false)
        
        // Log failed login attempt
        await this.logAuthEvent(
          null,
          'login',
          null,
          null,
          { email: data.email },
          false
        )
        const friendlyError = getAuthErrorMessage(authError.message, 'login')
        return { success: false, error: friendlyError }
      }

      if (!authData.user || !authData.session) {
        recordLoginAttempt(data.email, false)
        return { success: false, error: 'Failed to authenticate user' }
      }

      // Success - reset rate limiting
      recordLoginAttempt(data.email, true)

      // Update last login timestamp
      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authData.user.id)

      // Log successful login
      await this.logAuthEvent(
        authData.user.id,
        'login',
        null,
        null,
        null,
        true
      )

      return {
        success: true,
        user: authData.user || undefined,
        session: authData.session || undefined
      }
    } catch (error) {
      console.error('Login error:', error)
      recordLoginAttempt(data.email, false)
      return { success: false, error: 'An unexpected error occurred during login' }
    }
  }

  static async logout(): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        const friendlyError = getAuthErrorMessage(error.message, 'login')
        return { success: false, error: friendlyError }
      }

      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      return { success: false, error: 'An unexpected error occurred during logout' }
    }
  }

  static async resetPassword(email: string): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Check rate limiting
      const rateLimitCheck = checkPasswordResetRateLimit(email)
      if (rateLimitCheck.blocked) {
        const timeStr = rateLimitCheck.remainingTime ? formatRemainingTime(rateLimitCheck.remainingTime) : 'some time'
        return { success: false, error: `Too many password reset requests. Please try again in ${timeStr}.` }
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/auth/reset-password`
      })

      if (error) {
        recordPasswordResetAttempt(email, false)
        const friendlyError = getAuthErrorMessage(error.message, 'password_reset')
        return { success: false, error: friendlyError }
      }

      // Success - record attempt
      recordPasswordResetAttempt(email, true)
      return { success: true }
    } catch (error) {
      console.error('Password reset error:', error)
      recordPasswordResetAttempt(email, false)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async updatePassword(newPassword: string): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        const friendlyError = getAuthErrorMessage(error.message, 'password_reset')
        return { success: false, error: friendlyError }
      }

      // Log password change
      if (data.user) {
        await this.logAuthEvent(
          data.user.id,
          'password_change',
          null,
          null,
          null,
          true
        )
      }

      return { success: true, user: data.user }
    } catch (error) {
      console.error('Password update error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    if (!supabase) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  static async getCurrentSession(): Promise<Session | null> {
    if (!supabase) return null

    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    } catch (error) {
      console.error('Error getting current session:', error)
      return null
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    if (!supabase) return false

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)

      if (error) {
        console.error('Error updating user profile:', error)
        return false
      }

      // Log profile update
      await this.logAuthEvent(
        userId,
        'profile_update',
        null,
        null,
        { updated_fields: Object.keys(updates) },
        true
      )

      return true
    } catch (error) {
      console.error('Error updating user profile:', error)
      return false
    }
  }

  static onAuthStateChange(callback: (session: Session | null) => void) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }

    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session)
    })
  }

  private static async logAuthEvent(
    userId: string | null,
    action: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    additionalData?: Record<string, any> | null,
    success: boolean = true
  ): Promise<void> {
    if (!supabase) return

    try {
      await supabase.rpc('log_auth_event', {
        p_user_id: userId,
        p_action: action,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_additional_data: additionalData ? JSON.stringify(additionalData) : null,
        p_success: success
      })
    } catch (error) {
      console.error('Error logging auth event:', error)
    }
  }

  static async verifyEmailToken(token: string): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      })

      if (error) {
        const friendlyError = getAuthErrorMessage(error.message, 'email_verification')
        return { success: false, error: friendlyError }
      }

      return {
        success: true,
        user: data.user || undefined,
        session: data.session || undefined
      }
    } catch (error) {
      console.error('Email verification error:', error)
      return { success: false, error: 'An unexpected error occurred during email verification' }
    }
  }

  static async resendConfirmationEmail(email: string): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Check rate limiting
      const rateLimitCheck = checkEmailVerificationRateLimit(email)
      if (rateLimitCheck.blocked) {
        const timeStr = rateLimitCheck.remainingTime ? formatRemainingTime(rateLimitCheck.remainingTime) : 'some time'
        return { success: false, error: `Please wait ${timeStr} before requesting another verification email.` }
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${getSiteUrl()}/api/auth/callback`
        }
      })

      if (error) {
        recordEmailVerificationAttempt(email, false)
        const friendlyError = getAuthErrorMessage(error.message, 'email_verification')
        return { success: false, error: friendlyError }
      }

      // Success - record attempt
      recordEmailVerificationAttempt(email, true)
      return { success: true }
    } catch (error) {
      console.error('Resend confirmation error:', error)
      recordEmailVerificationAttempt(email, false)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }
}

// Password validation utility
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Email validation utility
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/
  return emailRegex.test(email)
}