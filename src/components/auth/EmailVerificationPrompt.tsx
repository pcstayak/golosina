'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'

interface EmailVerificationPromptProps {
  email: string
  onVerificationComplete?: () => void
  onChangeEmail?: () => void
}

export const EmailVerificationPrompt: React.FC<EmailVerificationPromptProps> = ({
  email,
  onVerificationComplete,
  onChangeEmail
}) => {
  const { resendConfirmation } = useAuth()
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60) // 60 second cooldown
  const [canResend, setCanResend] = useState(false)

  // Countdown timer for resend button
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [timeLeft])

  const handleResendEmail = async () => {
    setResendLoading(true)
    setResendError('')
    setResendSuccess(false)

    try {
      const result = await resendConfirmation(email)
      
      if (result.success) {
        setResendSuccess(true)
        setTimeLeft(60)
        setCanResend(false)
      } else {
        setResendError(result.error || 'Failed to resend verification email')
      }
    } catch (error) {
      console.error('Resend email error:', error)
      setResendError('An unexpected error occurred')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6 text-center">
      {/* Email icon */}
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
        <p className="text-gray-600 mt-2">
          We've sent a verification link to:
        </p>
        <p className="text-gray-900 font-medium mt-1">{email}</p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg text-left">
        <h3 className="font-medium text-blue-900 mb-2">What's next?</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Check your email inbox (and spam folder)</li>
          <li>Click the verification link in the email</li>
          <li>Complete your profile setup</li>
          <li>Start your voice training journey!</li>
        </ol>
      </div>

      {/* Status messages */}
      {resendSuccess && (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
          Verification email sent successfully! Check your inbox.
        </div>
      )}

      {resendError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {resendError}
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={handleResendEmail}
          disabled={!canResend || resendLoading}
          variant="outline"
          className="w-full"
        >
          {resendLoading 
            ? 'Sending...' 
            : canResend 
              ? 'Resend verification email' 
              : `Resend in ${timeLeft}s`
          }
        </Button>

        <div className="text-sm text-gray-500 space-y-2">
          <p>Didn't receive the email?</p>
          <div className="space-y-1">
            <p>• Check your spam/junk folder</p>
            <p>• Make sure {email} is correct</p>
            <p>• Try adding noreply@{window.location.hostname} to your contacts</p>
          </div>
        </div>

        {onChangeEmail && (
          <Button
            onClick={onChangeEmail}
            variant="ghost"
            className="w-full"
          >
            Use different email address
          </Button>
        )}
      </div>

      <div className="pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Having trouble? Contact our support team at support@{window.location.hostname}
        </p>
      </div>
    </div>
  )
}