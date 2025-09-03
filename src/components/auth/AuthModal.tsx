'use client'

import React, { useState, useEffect } from 'react'
import { LoginForm } from './LoginForm'
import { EnhancedRegistrationFlow } from './EnhancedRegistrationFlow'
import { ForgotPasswordForm } from './ForgotPasswordForm'

type AuthMode = 'login' | 'register' | 'forgot-password'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: AuthMode
  onSuccess?: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode)

  // Sync internal mode state with initialMode prop changes
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const handleSuccess = () => {
    onSuccess?.()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`
          relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto
          ${mode === 'register' ? 'max-w-4xl' : 'max-w-md'}
        `}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="p-6 pt-12">
            {mode === 'login' && (
              <LoginForm
                onSuccess={handleSuccess}
                onToggleToRegister={() => setMode('register')}
                onToggleToForgotPassword={() => setMode('forgot-password')}
              />
            )}

            {mode === 'register' && (
              <EnhancedRegistrationFlow
                onSuccess={handleSuccess}
                onToggleToLogin={() => setMode('login')}
              />
            )}

            {mode === 'forgot-password' && (
              <ForgotPasswordForm
                onBackToLogin={() => setMode('login')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}