'use client'

import React from 'react'
import { RoleSpecificJourney, UserJourneyTracker, formatEstimatedTime } from '../../lib/userJourney'

interface OnboardingProgressProps {
  journey: RoleSpecificJourney
  className?: string
  showDetails?: boolean
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  journey,
  className = '',
  showDetails = false
}) => {
  const stats = UserJourneyTracker.getCompletionStats(journey)
  const estimatedTime = UserJourneyTracker.getEstimatedTimeToComplete(journey)
  const nextStep = UserJourneyTracker.getNextIncompleteStep(journey)

  const getStepIcon = (step: any) => {
    if (step.completed) {
      return (
        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    } else if (step.id === nextStep?.id) {
      return (
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        </div>
      )
    } else {
      return (
        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-gray-500 rounded-full" />
        </div>
      )
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {journey.title}
        </h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {stats.requiredPercentage}%
          </div>
          <div className="text-xs text-gray-500">
            {stats.requiredCompleted} of {stats.requiredTotal} required
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{stats.completed} of {stats.total} steps</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      {/* Current status */}
      <div className="mb-4">
        {UserJourneyTracker.isOnboardingComplete(journey) ? (
          <div className="flex items-center space-x-2 text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Onboarding Complete!</span>
          </div>
        ) : nextStep ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Next: {nextStep.title}</span>
            </div>
            <p className="text-sm text-gray-600">{nextStep.description}</p>
            {estimatedTime > 0 && (
              <p className="text-xs text-gray-500">
                Estimated time remaining: {formatEstimatedTime(estimatedTime)}
              </p>
            )}
          </div>
        ) : (
          <div className="text-gray-600">
            <span>All required steps completed!</span>
          </div>
        )}
      </div>

      {/* Detailed step list */}
      {showDetails && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Steps</h4>
          <div className="space-y-3">
            {journey.steps.map((step) => (
              <div key={step.id} className="flex items-start space-x-3">
                {getStepIcon(step)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${
                      step.completed ? 'text-gray-700' : step.id === nextStep?.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                      {step.required && !step.completed && (
                        <span className="ml-1 text-red-500 text-xs">*</span>
                      )}
                    </p>
                    {step.estimatedMinutes && !step.completed && (
                      <span className="text-xs text-gray-400">
                        {step.estimatedMinutes}m
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            * Required steps
          </div>
        </div>
      )}
    </div>
  )
}