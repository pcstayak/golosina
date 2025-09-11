'use client'

import React from 'react'
import { Button } from '../ui/Button'

interface EmailVerificationSuccessProps {
  userRole?: string
  onContinueToApp?: () => void
  onSkipProfileSetup?: () => void
}

export const EmailVerificationSuccess: React.FC<EmailVerificationSuccessProps> = ({
  userRole,
  onContinueToApp,
  onSkipProfileSetup
}) => {
  const isTeacher = userRole === 'teacher'
  
  return (
    <div className="max-w-md mx-auto space-y-6 text-center">
      {/* Success icon */}
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email verified!</h1>
        <p className="text-gray-600 mt-2">
          Your account has been successfully verified. Welcome to Golosina!
        </p>
      </div>

      <div className={`${isTeacher ? 'bg-purple-50' : 'bg-blue-50'} p-4 rounded-lg text-left`}>
        <h3 className={`font-medium ${isTeacher ? 'text-purple-900' : 'text-blue-900'} mb-2`}>
          {isTeacher ? 'Complete your teaching profile' : 'Complete your learning profile'}
        </h3>
        <p className={`text-sm ${isTeacher ? 'text-purple-800' : 'text-blue-800'}`}>
          {isTeacher 
            ? 'Set up your teaching profile to start creating and sharing voice training lessons.'
            : 'Your account is now verified and you have access to all voice training exercises and features.'
          }
        </p>
      </div>

      <div className="space-y-3">
        {onContinueToApp && (
          <Button
            onClick={onContinueToApp}
            className="w-full"
          >
            {isTeacher ? 'Start teaching' : 'Start learning'}
          </Button>
        )}
        
        {onSkipProfileSetup && (
          <Button
            onClick={onSkipProfileSetup}
            variant="secondary"
            className="w-full"
          >
            Skip - Start voice training
          </Button>
        )}
      </div>

      <div className="pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600 space-y-2">
          <p className="font-medium">What you can do now:</p>
          <div className="text-left space-y-1">
            {isTeacher ? (
              <>
                <p>• Create custom voice training exercises</p>
                <p>• Share lessons with students</p>
                <p>• Track student progress</p>
                <p>• Access advanced teaching tools</p>
                <p>• Build your teaching portfolio</p>
              </>
            ) : (
              <>
                <p>• Practice breathing techniques</p>
                <p>• Complete vocal warm-up exercises</p>
                <p>• Work on pitch and interval training</p>
                <p>• Record and review your sessions</p>
                <p>• Share lessons with others</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}