'use client'

import React, { useState } from 'react'
import { RegisterForm } from './RegisterForm'
import { EmailVerificationPrompt } from './EmailVerificationPrompt'

interface RegistrationFlowProps {
  onSuccess?: () => void
  onToggleToLogin?: () => void
}

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({
  onSuccess,
  onToggleToLogin
}) => {
  const [step, setStep] = useState<'register' | 'verify-email'>('register')
  const [registeredEmail, setRegisteredEmail] = useState('')

  const handleRegistrationSuccess = (email: string) => {
    setRegisteredEmail(email)
    setStep('verify-email')
  }

  const handleVerificationComplete = () => {
    onSuccess?.()
  }

  const handleChangeEmail = () => {
    setStep('register')
    setRegisteredEmail('')
  }

  if (step === 'verify-email') {
    return (
      <EmailVerificationPrompt
        email={registeredEmail}
        onVerificationComplete={handleVerificationComplete}
        onChangeEmail={handleChangeEmail}
      />
    )
  }

  return (
    <RegisterForm
      onSuccess={(email: string) => handleRegistrationSuccess(email)}
      onToggleToLogin={onToggleToLogin}
    />
  )
}