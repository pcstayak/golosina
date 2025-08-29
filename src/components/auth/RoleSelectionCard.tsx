'use client'

import React from 'react'
import { UserRole } from '../../lib/supabase'

interface RoleOption {
  role: UserRole
  title: string
  description: string
  icon: string
  benefits: string[]
  comingSoon?: boolean
}

const roleOptions: RoleOption[] = [
  {
    role: 'student',
    title: 'I want to learn',
    description: 'Improve your voice with personalized lessons and expert guidance',
    icon: '🎤',
    benefits: [
      'Access to qualified voice teachers',
      'Personalized learning path',
      'Practice exercises and feedback',
      'Progress tracking',
      'Flexible scheduling'
    ]
  },
  {
    role: 'teacher',
    title: 'I want to teach',
    description: 'Share your expertise and build your voice coaching practice',
    icon: '🎵',
    benefits: [
      'Create your teaching profile',
      'Set your own rates and schedule',
      'Connect with motivated students',
      'Track student progress',
      'Build your reputation'
    ]
  }
]

interface RoleSelectionCardProps {
  selectedRole: UserRole | null
  onRoleSelect: (role: UserRole) => void
  className?: string
}

export const RoleSelectionCard: React.FC<RoleSelectionCardProps> = ({
  selectedRole,
  onRoleSelect,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">What brings you to Golosina?</h2>
        <p className="text-gray-600">Choose your role to get started with a personalized experience</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roleOptions.map((option) => (
          <div
            key={option.role}
            onClick={() => !option.comingSoon && onRoleSelect(option.role)}
            className={`
              relative p-6 rounded-lg border-2 transition-all cursor-pointer
              ${selectedRole === option.role
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }
              ${option.comingSoon ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          >
            {option.comingSoon && (
              <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                Coming Soon
              </div>
            )}

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                  {option.icon}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {option.description}
                </p>

                <ul className="space-y-2">
                  {option.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <svg 
                        className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M5 13l4 4L19 7" 
                        />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {selectedRole === option.role && (
              <div className="absolute top-2 left-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedRole && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900">
                {selectedRole === 'student' ? 'Student Journey' : 'Teacher Journey'}
              </h4>
              <p className="text-sm text-blue-800 mt-1">
                {selectedRole === 'student' 
                  ? 'After registration, you\'ll complete a learning assessment to help us match you with the perfect teacher and create your personalized learning path.'
                  : 'After registration, you\'ll set up your teaching profile, add credentials, and define your specializations to attract the right students.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}