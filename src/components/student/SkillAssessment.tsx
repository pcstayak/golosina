'use client'

import React, { useState, useEffect } from 'react'
import { StudentProfileService, SkillAssessment as SkillAssessmentType } from '../../services/studentProfileService'
import { Button } from '../ui/Button'

interface SkillAssessmentProps {
  userId: string
  existingAssessments?: Record<string, SkillAssessmentType>
  onComplete?: (assessments: Record<string, SkillAssessmentType>) => void
  onCancel?: () => void
}

interface AssessmentQuestion {
  category: string
  label: string
  description: string
  questions: {
    level: string
    confidence: string
  }
}

const SKILL_ASSESSMENTS: AssessmentQuestion[] = [
  {
    category: 'breath_support',
    label: 'Breath Support & Control',
    description: 'Your ability to control breathing for singing',
    questions: {
      level: 'How well can you control your breathing while singing?',
      confidence: 'How confident are you in your breath support skills?'
    }
  },
  {
    category: 'pitch_accuracy',
    label: 'Pitch Accuracy',
    description: 'Your ability to sing in tune',
    questions: {
      level: 'How accurately can you match and maintain pitch?',
      confidence: 'How confident are you in singing in tune?'
    }
  },
  {
    category: 'rhythm_timing',
    label: 'Rhythm & Timing',
    description: 'Your sense of rhythm and musical timing',
    questions: {
      level: 'How well can you keep time and follow rhythms?',
      confidence: 'How confident are you with rhythm and timing?'
    }
  },
  {
    category: 'vocal_range',
    label: 'Vocal Range',
    description: 'The span of notes you can sing comfortably',
    questions: {
      level: 'How would you rate your vocal range?',
      confidence: 'How confident are you singing in different parts of your range?'
    }
  },
  {
    category: 'articulation',
    label: 'Articulation & Diction',
    description: 'Clarity of words and pronunciation',
    questions: {
      level: 'How clearly do you articulate words when singing?',
      confidence: 'How confident are you in your diction and pronunciation?'
    }
  },
  {
    category: 'vocal_agility',
    label: 'Vocal Agility & Runs',
    description: 'Ability to sing fast passages and vocal runs',
    questions: {
      level: 'How well can you sing vocal runs and fast passages?',
      confidence: 'How confident are you with vocal agility exercises?'
    }
  },
  {
    category: 'expression_emotion',
    label: 'Expression & Emotion',
    description: 'Conveying emotion and meaning through singing',
    questions: {
      level: 'How well do you convey emotion in your singing?',
      confidence: 'How confident are you in expressing yourself through song?'
    }
  },
  {
    category: 'stage_presence',
    label: 'Stage Presence & Performance',
    description: 'Comfort and charisma when performing',
    questions: {
      level: 'How comfortable are you performing in front of others?',
      confidence: 'How confident are you as a performer?'
    }
  },
  {
    category: 'music_reading',
    label: 'Music Reading',
    description: 'Ability to read sheet music and notation',
    questions: {
      level: 'How well can you read musical notation?',
      confidence: 'How confident are you reading sheet music?'
    }
  },
  {
    category: 'ear_training',
    label: 'Ear Training & Listening',
    description: 'Musical listening skills and ear development',
    questions: {
      level: 'How well can you identify pitches, intervals, and chords by ear?',
      confidence: 'How confident are you in your listening and ear training skills?'
    }
  }
]

const RATING_LABELS = [
  { value: 1, label: 'Beginner', description: 'Just starting out' },
  { value: 2, label: 'Developing', description: 'Some experience' },
  { value: 3, label: 'Intermediate', description: 'Comfortable with basics' },
  { value: 4, label: 'Advanced', description: 'Strong skills' },
  { value: 5, label: 'Expert', description: 'Highly skilled' }
]

export const SkillAssessment: React.FC<SkillAssessmentProps> = ({
  userId,
  existingAssessments = {},
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [assessments, setAssessments] = useState<Record<string, SkillAssessmentType>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Initialize assessments with existing data or defaults
    const initialAssessments: Record<string, SkillAssessmentType> = {}
    
    SKILL_ASSESSMENTS.forEach(skill => {
      initialAssessments[skill.category] = existingAssessments[skill.category] || {
        category: skill.category,
        level: 1,
        confidence: 1,
        assessedAt: new Date().toISOString()
      }
    })
    
    setAssessments(initialAssessments)
  }, [existingAssessments])

  const currentSkill = SKILL_ASSESSMENTS[currentStep]
  const isLastStep = currentStep === SKILL_ASSESSMENTS.length - 1

  const updateAssessment = (category: string, field: 'level' | 'confidence', value: number) => {
    setAssessments(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
        assessedAt: new Date().toISOString()
      }
    }))
  }

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    
    try {
      const result = await StudentProfileService.updateSkillAssessment(userId, assessments)
      
      if (result.success) {
        onComplete?.(assessments)
      } else {
        alert('Failed to save assessment: ' + result.error)
      }
    } catch (error) {
      console.error('Assessment save error:', error)
      alert('An unexpected error occurred while saving your assessment')
    } finally {
      setLoading(false)
    }
  }

  const RatingScale: React.FC<{ 
    value: number
    onChange: (value: number) => void
    question: string 
  }> = ({ value, onChange, question }) => (
    <div className="space-y-4">
      <p className="text-gray-700 font-medium">{question}</p>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {RATING_LABELS.map((rating) => (
          <label
            key={rating.value}
            className={`
              p-3 border rounded-lg cursor-pointer text-center transition-all
              ${value === rating.value
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-blue-300'
              }
            `}
          >
            <input
              type="radio"
              name={question}
              value={rating.value}
              checked={value === rating.value}
              onChange={() => onChange(rating.value)}
              className="sr-only"
            />
            <div className="font-medium text-sm">{rating.label}</div>
            <div className="text-xs text-gray-600 mt-1">{rating.description}</div>
            <div className="text-lg font-bold mt-1">{rating.value}</div>
          </label>
        ))}
      </div>
    </div>
  )

  if (!currentSkill) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Skill Assessment</span>
          <span>{currentStep + 1} of {SKILL_ASSESSMENTS.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / SKILL_ASSESSMENTS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current skill assessment */}
      <div className="bg-white p-8 rounded-lg border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentSkill.label}
          </h2>
          <p className="text-gray-600">{currentSkill.description}</p>
        </div>

        <div className="space-y-8">
          {/* Skill Level */}
          <RatingScale
            value={assessments[currentSkill.category]?.level || 1}
            onChange={(value) => updateAssessment(currentSkill.category, 'level', value)}
            question={currentSkill.questions.level}
          />

          {/* Confidence Level */}
          <RatingScale
            value={assessments[currentSkill.category]?.confidence || 1}
            onChange={(value) => updateAssessment(currentSkill.category, 'confidence', value)}
            question={currentSkill.questions.confidence}
          />
        </div>

        {/* Help text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Assessment Tips:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Be honest - this helps us match you with the right teacher</li>
                <li>Don't worry about being "perfect" - everyone starts somewhere</li>
                <li>You can always update this assessment later as you improve</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <div>
          {currentStep > 0 && (
            <Button
              onClick={handlePrevious}
              variant="outline"
              disabled={loading}
            >
              Previous
            </Button>
          )}
        </div>

        <div className="flex space-x-4">
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="ghost"
              disabled={loading}
            >
              Skip Assessment
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={loading}
          >
            {loading 
              ? 'Saving...' 
              : isLastStep 
                ? 'Complete Assessment' 
                : 'Next'
            }
          </Button>
        </div>
      </div>

      {/* Overview of all assessments (for review) */}
      {currentStep === SKILL_ASSESSMENTS.length - 1 && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SKILL_ASSESSMENTS.map((skill) => {
              const assessment = assessments[skill.category]
              if (!assessment) return null

              return (
                <div key={skill.category} className="bg-white p-3 rounded border">
                  <div className="font-medium text-sm text-gray-900">{skill.label}</div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Skill: {RATING_LABELS[assessment.level - 1]?.label}</span>
                    <span>Confidence: {RATING_LABELS[assessment.confidence - 1]?.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-sm text-gray-600 mt-4">
            This information will help your teacher create personalized lessons for you.
          </p>
        </div>
      )}
    </div>
  )
}