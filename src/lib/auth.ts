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

// Utility function to get the correct site URL for email redirects
// Fixed: Ensures production environment always uses https://golosina.net and never localhost
function getSiteUrl(): string {
  // If we're in the browser, use the current origin
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    console.log('getSiteUrl (browser):', origin)

    // Production domain detection - never return localhost for golosina.net
    if (origin.includes('golosina.net')) {
      const productionUrl = 'https://golosina.net'
      console.log('Production domain detected, using:', productionUrl)
      return productionUrl
    }

    return origin
  }

  // Server-side logic
  console.log('getSiteUrl (server-side), checking environment variables...')
  console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)
  console.log('VERCEL_URL:', process.env.VERCEL_URL)
  console.log('NODE_ENV:', process.env.NODE_ENV)

  // Check for production environment variables first
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || process.env.SITE_URL

  if (siteUrl) {
    // Ensure HTTPS for production URLs (but not localhost)
    if (siteUrl.startsWith('http://') && !siteUrl.includes('localhost')) {
      const httpsUrl = siteUrl.replace('http://', 'https://')
      console.log('Converting HTTP to HTTPS:', siteUrl, '->', httpsUrl)
      return httpsUrl
    }

    // If it's a Vercel URL without protocol, add https
    if (siteUrl.includes('.vercel.app') && !siteUrl.startsWith('http')) {
      const vercelUrl = `https://${siteUrl}`
      console.log('Adding HTTPS to Vercel URL:', siteUrl, '->', vercelUrl)
      return vercelUrl
    }

    console.log('Using configured site URL:', siteUrl)
    return siteUrl
  }

  // Production fallback - if we're in production environment, use the production domain
  if (process.env.NODE_ENV === 'production') {
    const productionUrl = 'https://golosina.net'
    console.log('Production environment detected, using production domain:', productionUrl)
    return productionUrl
  }

  // Default to localhost only in development
  const developmentUrl = 'http://localhost:3000'
  console.log('Development environment, using:', developmentUrl)
  return developmentUrl
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
  static async signInWithGoogle(): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const siteUrl = getSiteUrl()
      const redirectTo = `${siteUrl}/auth/callback`

      console.log('Google OAuth configuration:', {
        siteUrl,
        redirectTo,
        environment: process.env.NODE_ENV,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
      })

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        // Log failed OAuth attempt
        await this.logAuthEvent(
          null,
          'oauth_login',
          null,
          null,
          { provider: 'google', error: error.message },
          false
        )
        return { success: false, error: error.message }
      }

      // OAuth success - the actual user data will be handled by the auth state change listener
      // Log successful OAuth initiation
      await this.logAuthEvent(
        null,
        'oauth_login',
        null,
        null,
        { provider: 'google' },
        true
      )

      return { success: true }
    } catch (error) {
      console.error('Google OAuth error:', error)
      return { success: false, error: 'An unexpected error occurred during Google sign-in' }
    }
  }

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
          emailRedirectTo: `${getSiteUrl()}/auth/callback`,
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
        return { success: false, error: authError.message }
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
        return { success: false, error: authError.message }
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
        return { success: false, error: error.message }
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
        return { success: false, error: error.message }
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
        return { success: false, error: error.message }
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

  static async createOAuthUserProfile(userId: string, userData: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string;
    provider: string;
  }): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      console.log('Creating OAuth user profile:', {
        userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        provider: userData.provider
      })

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          display_name: userData.displayName,
          role: 'student', // Default role for OAuth users
          terms_accepted: true, // Assumed for OAuth users who completed the flow
          privacy_policy_accepted: true, // Assumed for OAuth users who completed the flow
          marketing_emails_consent: false, // Default to false, user can opt-in later
          profile_completion: (userData.firstName && userData.lastName) ? 'basic' : 'incomplete'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating OAuth user profile:', error)
        return { success: false, error: error.message }
      }

      // Also create student profile since we default to student role
      const { error: studentError } = await supabase
        .from('student_profiles')
        .insert({
          id: userId,
          experience_level: 'beginner'
        })

      if (studentError) {
        console.warn('Warning: Could not create student profile for OAuth user:', studentError)
        // Don't fail the whole operation for this
      }

      // Log the profile creation
      await this.logAuthEvent(
        userId,
        'oauth_profile_created',
        null,
        null,
        { provider: userData.provider, profile_completion: profile.profile_completion },
        true
      )

      console.log('OAuth user profile created successfully:', profile)
      return { success: true }
    } catch (error) {
      console.error('Error creating OAuth user profile:', error)
      return { success: false, error: 'Failed to create user profile' }
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
        return { success: false, error: error.message }
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
          emailRedirectTo: `${getSiteUrl()}/auth/callback`
        }
      })

      if (error) {
        recordEmailVerificationAttempt(email, false)
        return { success: false, error: error.message }
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