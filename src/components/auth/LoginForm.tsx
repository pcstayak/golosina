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
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-600 mt-2">Sign in to your account</p>
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
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <div>{errors.general}</div>
                {errors.suggestedAction === 'register' && onToggleToRegister && (
                  <button
                    onClick={onToggleToRegister}
                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  >
                    Create an account
                  </button>
                )}
                {errors.suggestedAction === 'verify_email' && (
                  <div className="mt-2 text-sm text-blue-700">
                    Please check your email for the verification link.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onToggleToForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onToggleToRegister}
            className="text-blue-600 hover:text-blue-500 focus:outline-none focus:underline font-medium"
            disabled={loading}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}