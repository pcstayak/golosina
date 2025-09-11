/**
 * Translates Supabase auth error messages into user-friendly messages
 */

export interface FriendlyAuthError {
  message: string
  actionable?: boolean
  suggestedAction?: string
}

/**
 * Maps common Supabase error messages to user-friendly messages
 */
const ERROR_TRANSLATIONS: Record<string, FriendlyAuthError> = {
  // Registration errors
  'User already registered': {
    message: 'This email is already registered. Try signing in instead or use a different email address.',
    actionable: true,
    suggestedAction: 'sign_in'
  },
  'Invalid email': {
    message: 'Please enter a valid email address.',
    actionable: true
  },
  'Password should be at least 6 characters': {
    message: 'Password must be at least 6 characters long. Please choose a stronger password.',
    actionable: true
  },
  'Email not confirmed - register': {
    message: 'Please check your email and click the verification link to activate your account.',
    actionable: true,
    suggestedAction: 'verify_email'
  },
  'Signup is disabled': {
    message: 'New account creation is currently disabled. Please contact support if you need assistance.',
    actionable: false
  },

  // Login errors
  'Invalid login credentials': {
    message: 'The email or password you entered is incorrect. Please try again.',
    actionable: true
  },
  'Email not confirmed - login': {
    message: 'Please verify your email address before signing in. Check your inbox for the verification link.',
    actionable: true,
    suggestedAction: 'verify_email'
  },
  'Too many requests': {
    message: 'Too many failed login attempts. Please wait a few minutes before trying again.',
    actionable: true
  },
  'User not found - login': {
    message: 'No account found with this email address. Please check your email or create a new account.',
    actionable: true,
    suggestedAction: 'register'
  },

  // Password reset errors
  'User not found - password_reset': {
    message: 'No account found with this email address. Please check your email or create a new account.',
    actionable: true,
    suggestedAction: 'register'
  },

  // Network and system errors
  'Network request failed': {
    message: 'Connection problem. Please check your internet connection and try again.',
    actionable: true
  },
  'Failed to fetch': {
    message: 'Unable to connect to our servers. Please check your internet connection and try again.',
    actionable: true
  },
  'Request timeout': {
    message: 'The request took too long to complete. Please try again.',
    actionable: true
  },

  // Rate limiting errors (these are handled separately but included for completeness)
  'Rate limit exceeded': {
    message: 'Too many attempts. Please wait a few minutes before trying again.',
    actionable: true
  },

  // Generic validation errors
  'Invalid input': {
    message: 'Please check your information and try again.',
    actionable: true
  },
  'Validation failed': {
    message: 'Please check that all required fields are filled out correctly.',
    actionable: true
  },

  // Email verification errors
  'Token has expired or is invalid': {
    message: 'This verification link has expired or is invalid. Please request a new verification email.',
    actionable: true,
    suggestedAction: 'resend_verification'
  },
  'Email link is invalid or has expired': {
    message: 'This verification link has expired or is invalid. Please request a new verification email.',
    actionable: true,
    suggestedAction: 'resend_verification'
  }
}

/**
 * Translates a Supabase error message to a user-friendly message
 * @param supabaseError - The error message from Supabase
 * @param context - Additional context about where the error occurred
 * @returns User-friendly error message and metadata
 */
export function translateAuthError(
  supabaseError: string, 
  context: 'register' | 'login' | 'password_reset' | 'email_verification' = 'register'
): FriendlyAuthError {
  // Clean up the error message - remove common prefixes
  const cleanError = supabaseError
    .replace(/^(Error: |AuthError: |AuthApiError: )/, '')
    .trim()

  // Try exact match first
  if (ERROR_TRANSLATIONS[cleanError]) {
    return ERROR_TRANSLATIONS[cleanError]
  }

  // Try context-specific matches first
  const contextSpecificKey = `${cleanError} - ${context}`
  if (ERROR_TRANSLATIONS[contextSpecificKey]) {
    return ERROR_TRANSLATIONS[contextSpecificKey]
  }

  // Try partial matches for common patterns
  if (cleanError.toLowerCase().includes('already registered') || 
      cleanError.toLowerCase().includes('user already exists')) {
    return ERROR_TRANSLATIONS['User already registered']
  }

  if (cleanError.toLowerCase().includes('invalid login') || 
      cleanError.toLowerCase().includes('invalid credentials')) {
    return ERROR_TRANSLATIONS['Invalid login credentials']
  }

  if (cleanError.toLowerCase().includes('email not confirmed') ||
      cleanError.toLowerCase().includes('email not verified')) {
    const contextKey = `Email not confirmed - ${context}`
    return ERROR_TRANSLATIONS[contextKey] || ERROR_TRANSLATIONS['Email not confirmed - register']
  }

  if (cleanError.toLowerCase().includes('too many') && 
      cleanError.toLowerCase().includes('request')) {
    return ERROR_TRANSLATIONS['Too many requests']
  }

  if (cleanError.toLowerCase().includes('user not found') ||
      cleanError.toLowerCase().includes('no user found')) {
    const contextKey = `User not found - ${context}`
    return ERROR_TRANSLATIONS[contextKey] || ERROR_TRANSLATIONS['User not found - login']
  }

  if (cleanError.toLowerCase().includes('network') || 
      cleanError.toLowerCase().includes('fetch')) {
    return ERROR_TRANSLATIONS['Network request failed']
  }

  if (cleanError.toLowerCase().includes('expired') || 
      cleanError.toLowerCase().includes('invalid') && 
      cleanError.toLowerCase().includes('token')) {
    return ERROR_TRANSLATIONS['Token has expired or is invalid']
  }

  if (cleanError.toLowerCase().includes('password') && 
      cleanError.toLowerCase().includes('6 characters')) {
    return ERROR_TRANSLATIONS['Password should be at least 6 characters']
  }

  if (cleanError.toLowerCase().includes('invalid email')) {
    return ERROR_TRANSLATIONS['Invalid email']
  }

  // Context-specific fallbacks
  const contextFallbacks = {
    register: {
      message: 'Unable to create your account. Please check your information and try again.',
      actionable: true
    },
    login: {
      message: 'Unable to sign in. Please check your email and password and try again.',
      actionable: true
    },
    password_reset: {
      message: 'Unable to send password reset email. Please check your email address and try again.',
      actionable: true
    },
    email_verification: {
      message: 'Unable to verify your email. Please try the verification link again or request a new one.',
      actionable: true,
      suggestedAction: 'resend_verification'
    }
  }

  // If no specific translation found, use context-appropriate fallback
  return contextFallbacks[context] || {
    message: 'An unexpected error occurred. Please try again.',
    actionable: true
  }
}

/**
 * Get user-friendly error message for display
 * @param error - The error from Supabase
 * @param context - Context where the error occurred
 * @returns Formatted error message string
 */
export function getAuthErrorMessage(
  error: string, 
  context: 'register' | 'login' | 'password_reset' | 'email_verification' = 'register'
): string {
  const translated = translateAuthError(error, context)
  return translated.message
}

/**
 * Check if an error suggests the user should try a different action
 * @param error - The error from Supabase
 * @param context - Context where the error occurred
 * @returns Suggested action or null
 */
export function getAuthErrorAction(
  error: string,
  context: 'register' | 'login' | 'password_reset' | 'email_verification' = 'register'
): string | null {
  const translated = translateAuthError(error, context)
  return translated.suggestedAction || null
}