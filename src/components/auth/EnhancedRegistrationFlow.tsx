'use client'

import React, { useState } from 'react'
import { RoleSelectionCard } from './RoleSelectionCard'
import { RegisterForm } from './RegisterForm'
import { EmailVerificationPrompt } from './EmailVerificationPrompt'
import { UserRole } from '../../lib/supabase'

interface EnhancedRegistrationFlowProps {
  onSuccess?: () => void
  onToggleToLogin?: () => void
}

type FlowStep = 'role-selection' | 'registration' | 'email-verification'

export const EnhancedRegistrationFlow: React.FC<EnhancedRegistrationFlowProps> = ({
  onSuccess,
  onToggleToLogin
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('role-selection')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
  }

  const handleContinueToRegistration = () => {
    if (selectedRole) {
      setCurrentStep('registration')
    }
  }

  const handleBackToRoleSelection = () => {
    setCurrentStep('role-selection')
  }

  const handleRegistrationSuccess = (email: string) => {
    setRegisteredEmail(email)
    setCurrentStep('email-verification')
  }

  const handleVerificationComplete = () => {
    onSuccess?.()
  }

  const handleChangeEmail = () => {
    setCurrentStep('registration')
    setRegisteredEmail('')
  }

  const renderStepIndicator = () => {
    const steps = [
      { key: 'role-selection', label: 'Choose Role', icon: '1' },
      { key: 'registration', label: 'Account Details', icon: '2' },
      { key: 'email-verification', label: 'Verify Email', icon: '3' }
    ]

    return (
      <div className="mb-8">
        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => {
              const isActive = step.key === currentStep
              const isCompleted = steps.findIndex(s => s.key === currentStep) > index
              const isPast = steps.findIndex(s => s.key === currentStep) > index

              return (
                <React.Fragment key={step.key}>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                        ${isActive 
                          ? 'bg-blue-600 text-white' 
                          : isCompleted 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div
                      className={`
                        w-8 h-0.5 transition-colors
                        ${isPast ? 'bg-green-600' : 'bg-gray-200'}
                      `}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {renderStepIndicator()}

      {currentStep === 'role-selection' && (
        <div className="space-y-6">
          <RoleSelectionCard
            selectedRole={selectedRole}
            onRoleSelect={handleRoleSelect}
          />

          <div className="flex justify-between items-center">
            <button
              onClick={onToggleToLogin}
              className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:underline"
            >
              Already have an account? Sign in
            </button>

            <button
              onClick={handleContinueToRegistration}
              disabled={!selectedRole}
              className={`
                px-6 py-2 rounded-md font-medium text-sm transition-colors
                ${selectedRole
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === 'registration' && selectedRole && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-600 mt-2">
              {selectedRole === 'student' 
                ? 'Start your voice training journey as a student'
                : 'Begin building your teaching practice'
              }
            </p>
          </div>

          <RegisterForm
            initialRole={selectedRole}
            onSuccess={handleRegistrationSuccess}
            onToggleToLogin={onToggleToLogin}
            showRoleSelection={false}
          />

          <div className="text-center">
            <button
              onClick={handleBackToRoleSelection}
              className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            >
              ← Back to role selection
            </button>
          </div>
        </div>
      )}

      {currentStep === 'email-verification' && (
        <EmailVerificationPrompt
          email={registeredEmail}
          onVerificationComplete={handleVerificationComplete}
          onChangeEmail={handleChangeEmail}
        />
      )}
    </div>
  )
}