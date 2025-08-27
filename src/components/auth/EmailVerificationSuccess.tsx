'use client'

import React from 'react'
import { Button } from '../ui/Button'

interface EmailVerificationSuccessProps {
  userRole?: string
  onContinueToProfile?: () => void
  onContinueToDashboard?: () => void
}

export const EmailVerificationSuccess: React.FC<EmailVerificationSuccessProps> = ({
  userRole,
  onContinueToProfile,
  onContinueToDashboard
}) => {
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

      <div className="bg-blue-50 p-4 rounded-lg text-left">
        <h3 className="font-medium text-blue-900 mb-2">
          {userRole === 'teacher' 
            ? 'Complete your teaching profile' 
            : 'Complete your learning profile'
          }
        </h3>
        <p className="text-sm text-blue-800">
          {userRole === 'teacher' 
            ? 'Add your credentials, specializations, and teaching philosophy to help students find you.'
            : 'Tell us about your goals, experience level, and preferences to get personalized lessons.'
          }
        </p>
      </div>

      <div className="space-y-3">
        {onContinueToProfile && (
          <Button
            onClick={onContinueToProfile}
            className="w-full"
          >
            Complete profile setup
          </Button>
        )}

        {onContinueToDashboard && (
          <Button
            onClick={onContinueToDashboard}
            variant="outline"
            className="w-full"
          >
            Skip for now - Go to dashboard
          </Button>
        )}
      </div>

      <div className="pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600 space-y-2">
          <p className="font-medium">What you can do now:</p>
          <div className="text-left space-y-1">
            {userRole === 'teacher' ? (
              <>
                <p>• Set up your teaching profile</p>
                <p>• Upload credentials for verification</p>
                <p>• Define your specializations and rates</p>
                <p>• Start accepting students</p>
              </>
            ) : (
              <>
                <p>• Complete your learning assessment</p>
                <p>• Set your practice goals</p>
                <p>• Browse available teachers</p>
                <p>• Start your first lesson</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}