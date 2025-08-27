import { supabase, UserProfile, UserRole } from './supabase'
import { AuthError, User, Session } from '@supabase/supabase-js'

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
      // Validate required fields
      if (!data.email || !data.password) {
        return { success: false, error: 'Email and password are required' }
      }

      if (!data.termsAccepted || !data.privacyPolicyAccepted) {
        return { success: false, error: 'You must accept the terms of service and privacy policy' }
      }

      if (data.password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' }
      }

      // Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
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
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account' }
      }

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
        user: authData.user,
        session: authData.session
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'An unexpected error occurred during registration' }
    }
  }

  static async login(data: LoginData): Promise<AuthResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
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
        return { success: false, error: 'Failed to authenticate user' }
      }

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
        user: authData.user,
        session: authData.session
      }
    } catch (error) {
      console.error('Login error:', error)
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Password reset error:', error)
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

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

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
        user: data.user,
        session: data.session
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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Resend confirmation error:', error)
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