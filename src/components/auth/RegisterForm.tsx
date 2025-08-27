'use client'

import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { validateEmail, validatePassword } from '../../lib/auth'
import { UserRole } from '../../lib/supabase'
import { Button } from '../ui/Button'

interface RegisterFormProps {
  onSuccess?: (email: string) => void
  onToggleToLogin?: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onToggleToLogin
}) => {
  const { signUp } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'student' as UserRole,
    termsAccepted: false,
    privacyPolicyAccepted: false,
    marketingEmailsConsent: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing/changing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else {
      const passwordValidation = validatePassword(formData.password)
      if (!passwordValidation.valid) {
        newErrors.password = passwordValidation.errors[0]
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }

    // Terms and privacy policy validation
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms of service'
    }

    if (!formData.privacyPolicyAccepted) {
      newErrors.privacyPolicyAccepted = 'You must accept the privacy policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        termsAccepted: formData.termsAccepted,
        privacyPolicyAccepted: formData.privacyPolicyAccepted,
        marketingEmailsConsent: formData.marketingEmailsConsent
      })
      
      if (result.success) {
        onSuccess?.(formData.email)
      } else {
        setErrors({ general: result.error || 'Registration failed' })
      }
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-gray-600 mt-2">Start your voice training journey</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {errors.general}
          </div>
        )}

        {/* Role Selection */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            I am a...
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="student">Student - I want to learn voice training</option>
            <option value="teacher">Teacher - I want to teach voice training</option>
          </select>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.firstName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="First name"
              autoComplete="given-name"
              disabled={loading}
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.lastName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="Last name"
              autoComplete="family-name"
              disabled={loading}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
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

        {/* Password */}
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
            placeholder="Create a strong password"
            autoComplete="new-password"
            disabled={loading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Must be 8+ characters with uppercase, lowercase, number, and special character
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            placeholder="Confirm your password"
            autoComplete="new-password"
            disabled={loading}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Terms and Privacy Checkboxes */}
        <div className="space-y-3">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="termsAccepted"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="termsAccepted" className="ml-2 text-sm text-gray-700">
              I agree to the{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-500 underline" target="_blank">
                Terms of Service
              </a>
            </label>
          </div>
          {errors.termsAccepted && (
            <p className="text-sm text-red-600">{errors.termsAccepted}</p>
          )}

          <div className="flex items-start">
            <input
              type="checkbox"
              id="privacyPolicyAccepted"
              name="privacyPolicyAccepted"
              checked={formData.privacyPolicyAccepted}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="privacyPolicyAccepted" className="ml-2 text-sm text-gray-700">
              I agree to the{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-500 underline" target="_blank">
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.privacyPolicyAccepted && (
            <p className="text-sm text-red-600">{errors.privacyPolicyAccepted}</p>
          )}

          <div className="flex items-start">
            <input
              type="checkbox"
              id="marketingEmailsConsent"
              name="marketingEmailsConsent"
              checked={formData.marketingEmailsConsent}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="marketingEmailsConsent" className="ml-2 text-sm text-gray-700">
              I'd like to receive tips, updates, and special offers via email (optional)
            </label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onToggleToLogin}
            className="text-blue-600 hover:text-blue-500 focus:outline-none focus:underline font-medium"
            disabled={loading}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}