'use client'

import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { validateEmail } from '../../lib/auth'
import { translateAuthError } from '../../lib/authErrorTranslator'
import { Button } from '../ui/Button'
import { GoogleSignInButton } from './GoogleSignInButton'

interface LoginFormProps {
  onSuccess?: () => void
  onToggleToRegister?: () => void
  onToggleToForgotPassword?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onToggleToRegister,
  onToggleToForgotPassword
}) => {
  const { signIn } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      const result = await signIn(formData.email, formData.password)
      
      if (result.success) {
        onSuccess?.()
      } else {
        // Use error translator to get user-friendly message and actions
        const errorDetails = translateAuthError(result.error || 'Login failed', 'login')
        setErrors({ 
          general: errorDetails.message,
          ...(errorDetails.suggestedAction && { suggestedAction: errorDetails.suggestedAction })
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-[var(--text)]">Welcome back</h1>
        <p className="text-[var(--muted)] mt-2">Sign in to your account</p>
      </div>

      {/* Google Sign-In */}
      <div className="space-y-3">
        <GoogleSignInButton
          onSuccess={onSuccess}
          onError={(error) => setErrors({ general: error })}
          disabled={loading}
        />
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[rgba(11,18,32,0.95)] text-[var(--muted)]">Or continue with email</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 text-sm text-[var(--danger)] bg-[rgba(var(--danger-rgb),0.1)] border border-[var(--danger)] rounded-[10px]">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-[var(--danger)] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <div>{errors.general}</div>
                {errors.suggestedAction === 'register' && onToggleToRegister && (
                  <button
                    onClick={onToggleToRegister}
                    className="mt-2 text-sm font-medium text-[var(--primary)] hover:opacity-80 underline focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded"
                  >
                    Create an account
                  </button>
                )}
                {errors.suggestedAction === 'verify_email' && (
                  <div className="mt-2 text-sm text-[var(--primary)]">
                    Please check your email for the verification link.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)] mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-[10px] bg-[var(--panel)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 ${
              errors.email ? 'border-[var(--danger)] focus:ring-[var(--danger)]' : 'border-[var(--border)] focus:ring-[var(--primary)]'
            }`}
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-[var(--danger)]">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)] mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-[10px] bg-[var(--panel)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 ${
              errors.password ? 'border-[var(--danger)] focus:ring-[var(--danger)]' : 'border-[var(--border)] focus:ring-[var(--primary)]'
            }`}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-[var(--danger)]">{errors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onToggleToForgotPassword}
            className="text-sm text-[var(--primary)] hover:opacity-80 focus:outline-none focus:underline"
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-[var(--muted)]">
          Don't have an account?{' '}
          <button
            onClick={onToggleToRegister}
            className="text-[var(--primary)] hover:opacity-80 focus:outline-none focus:underline font-extrabold"
            disabled={loading}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}