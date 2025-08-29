// Simple in-memory rate limiting for client-side protection
// Note: This is basic protection. Production should use server-side rate limiting

interface RateLimitEntry {
  attempts: number
  lastAttempt: number
  blockedUntil?: number
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map()
  private readonly MAX_ATTEMPTS = 5
  private readonly WINDOW_MS = 15 * 60 * 1000 // 15 minutes
  private readonly BLOCK_DURATION_MS = 30 * 60 * 1000 // 30 minutes

  private getKey(identifier: string, action: string): string {
    return `${action}:${identifier}`
  }

  private now(): number {
    return Date.now()
  }

  private cleanupExpired(): void {
    const now = this.now()
    for (const [key, entry] of Array.from(this.storage.entries())) {
      // Clean up entries that are older than our window and not blocked
      if (!entry.blockedUntil && (now - entry.lastAttempt) > this.WINDOW_MS) {
        this.storage.delete(key)
      }
      // Clean up expired blocks
      if (entry.blockedUntil && now > entry.blockedUntil) {
        this.storage.delete(key)
      }
    }
  }

  isBlocked(identifier: string, action: string): { blocked: boolean; remainingTime?: number } {
    this.cleanupExpired()
    
    const key = this.getKey(identifier, action)
    const entry = this.storage.get(key)
    
    if (!entry) {
      return { blocked: false }
    }

    const now = this.now()

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      const remainingTime = Math.ceil((entry.blockedUntil - now) / 1000)
      return { blocked: true, remainingTime }
    }

    // Check if we've exceeded attempts in the current window
    if (entry.attempts >= this.MAX_ATTEMPTS && (now - entry.lastAttempt) < this.WINDOW_MS) {
      // Block the identifier
      entry.blockedUntil = now + this.BLOCK_DURATION_MS
      this.storage.set(key, entry)
      
      const remainingTime = Math.ceil(this.BLOCK_DURATION_MS / 1000)
      return { blocked: true, remainingTime }
    }

    return { blocked: false }
  }

  recordAttempt(identifier: string, action: string, success: boolean): void {
    this.cleanupExpired()
    
    const key = this.getKey(identifier, action)
    const now = this.now()
    const entry = this.storage.get(key)

    if (success) {
      // Success resets the counter
      this.storage.delete(key)
      return
    }

    if (!entry) {
      this.storage.set(key, {
        attempts: 1,
        lastAttempt: now
      })
      return
    }

    // If this attempt is outside our window, reset
    if ((now - entry.lastAttempt) > this.WINDOW_MS) {
      this.storage.set(key, {
        attempts: 1,
        lastAttempt: now
      })
      return
    }

    // Increment attempts
    entry.attempts++
    entry.lastAttempt = now
    this.storage.set(key, entry)
  }

  getRemainingAttempts(identifier: string, action: string): number {
    const key = this.getKey(identifier, action)
    const entry = this.storage.get(key)
    
    if (!entry) {
      return this.MAX_ATTEMPTS
    }

    const now = this.now()

    // If outside window, reset
    if ((now - entry.lastAttempt) > this.WINDOW_MS) {
      return this.MAX_ATTEMPTS
    }

    return Math.max(0, this.MAX_ATTEMPTS - entry.attempts)
  }

  getWindowResetTime(identifier: string, action: string): number | null {
    const key = this.getKey(identifier, action)
    const entry = this.storage.get(key)
    
    if (!entry) {
      return null
    }

    return entry.lastAttempt + this.WINDOW_MS
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Specific rate limiting functions for different actions
export const checkRegistrationRateLimit = (email: string) => {
  return rateLimiter.isBlocked(email, 'registration')
}

export const recordRegistrationAttempt = (email: string, success: boolean) => {
  rateLimiter.recordAttempt(email, 'registration', success)
}

export const checkLoginRateLimit = (email: string) => {
  return rateLimiter.isBlocked(email, 'login')
}

export const recordLoginAttempt = (email: string, success: boolean) => {
  rateLimiter.recordAttempt(email, 'login', success)
}

export const checkPasswordResetRateLimit = (email: string) => {
  return rateLimiter.isBlocked(email, 'password_reset')
}

export const recordPasswordResetAttempt = (email: string, success: boolean) => {
  rateLimiter.recordAttempt(email, 'password_reset', success)
}

export const checkEmailVerificationRateLimit = (email: string) => {
  return rateLimiter.isBlocked(email, 'email_verification')
}

export const recordEmailVerificationAttempt = (email: string, success: boolean) => {
  rateLimiter.recordAttempt(email, 'email_verification', success)
}

// Utility function to format remaining time
export const formatRemainingTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    return `${minutes}m ${remainingSeconds}s`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
  return `${hours}h ${remainingMinutes}m`
}