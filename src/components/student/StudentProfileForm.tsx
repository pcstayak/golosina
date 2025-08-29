'use client'

import React, { useState } from 'react'
import { 
  StudentProfileService, 
  CreateStudentProfileData, 
  UpdateStudentProfileData 
} from '../../services/studentProfileService'
import { StudentProfile } from '../../lib/supabase'
import { Button } from '../ui/Button'

interface StudentProfileFormProps {
  userId: string
  existingProfile?: StudentProfile
  onSuccess?: (profile: StudentProfile) => void
  onCancel?: () => void
}

const AGE_RANGES = [
  { value: '13-17', label: '13-17 years' },
  { value: '18-24', label: '18-24 years' },
  { value: '25-34', label: '25-34 years' },
  { value: '35-44', label: '35-44 years' },
  { value: '45-54', label: '45-54 years' },
  { value: '55-64', label: '55-64 years' },
  { value: '65+', label: '65+ years' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
]

const EXPERIENCE_LEVELS = [
  { 
    value: 'absolute_beginner', 
    label: 'Absolute Beginner', 
    description: 'No previous vocal training or singing experience' 
  },
  { 
    value: 'beginner', 
    label: 'Beginner', 
    description: 'Some casual singing, basic understanding' 
  },
  { 
    value: 'intermediate', 
    label: 'Intermediate', 
    description: 'Some formal training, can sing songs confidently' 
  },
  { 
    value: 'advanced', 
    label: 'Advanced', 
    description: 'Extensive training, strong technical foundation' 
  },
  { 
    value: 'professional', 
    label: 'Professional/Semi-Professional', 
    description: 'Professional experience or advanced training' 
  }
]

const PRACTICE_FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: 'I practice every day' },
  { value: 'several_times_week', label: 'Several times a week', description: '3-6 times per week' },
  { value: 'weekly', label: 'Weekly', description: '1-2 times per week' },
  { value: 'occasionally', label: 'Occasionally', description: 'When I have time' },
  { value: 'rarely', label: 'Rarely', description: 'Very infrequently' }
]

export const StudentProfileForm: React.FC<StudentProfileFormProps> = ({
  userId,
  existingProfile,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    ageRange: existingProfile?.age_range || '',
    experienceLevel: existingProfile?.experience_level || 'beginner',
    goals: existingProfile?.goals || [] as string[],
    preferredGenres: existingProfile?.preferred_genres || [] as string[],
    voiceType: existingProfile?.voice_type || '',
    physicalLimitations: existingProfile?.physical_limitations || '',
    accessibilityNeeds: existingProfile?.accessibility_needs || '',
    learningPreferences: existingProfile?.learning_preferences || [] as string[],
    practiceFrequency: existingProfile?.practice_frequency || '',
    timezone: existingProfile?.timezone || 'UTC'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const commonGoals = StudentProfileService.getCommonGoals()
  const commonGenres = StudentProfileService.getCommonGenres()
  const voiceTypes = StudentProfileService.getVoiceTypes()
  const learningPreferences = StudentProfileService.getLearningPreferences()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleMultiSelectChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => {
      const currentArray = prev[field] as string[]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      
      return {
        ...prev,
        [field]: newArray
      }
    })

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.experienceLevel) {
      newErrors.experienceLevel = 'Experience level is required'
    }

    if (formData.goals.length === 0) {
      newErrors.goals = 'Please select at least one goal'
    }

    if (formData.preferredGenres.length === 0) {
      newErrors.preferredGenres = 'Please select at least one preferred genre'
    }

    if (formData.learningPreferences.length === 0) {
      newErrors.learningPreferences = 'Please select at least one learning preference'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      let result

      if (existingProfile) {
        // Update existing profile
        const updateData: UpdateStudentProfileData = {
          ageRange: formData.ageRange || undefined,
          experienceLevel: formData.experienceLevel,
          goals: formData.goals,
          preferredGenres: formData.preferredGenres,
          voiceType: formData.voiceType || undefined,
          physicalLimitations: formData.physicalLimitations || undefined,
          accessibilityNeeds: formData.accessibilityNeeds || undefined,
          learningPreferences: formData.learningPreferences,
          practiceFrequency: formData.practiceFrequency || undefined,
          timezone: formData.timezone
        }

        result = await StudentProfileService.updateProfile(userId, updateData)
      } else {
        // Create new profile
        const createData: CreateStudentProfileData = {
          userId,
          ageRange: formData.ageRange || undefined,
          experienceLevel: formData.experienceLevel,
          goals: formData.goals,
          preferredGenres: formData.preferredGenres,
          voiceType: formData.voiceType || undefined,
          physicalLimitations: formData.physicalLimitations || undefined,
          accessibilityNeeds: formData.accessibilityNeeds || undefined,
          learningPreferences: formData.learningPreferences,
          practiceFrequency: formData.practiceFrequency || undefined,
          timezone: formData.timezone
        }

        result = await StudentProfileService.createProfile(createData)
      }

      if (result.success && result.profile) {
        onSuccess?.(result.profile)
      } else {
        setErrors({ general: result.error || 'Failed to save profile' })
      }
    } catch (error) {
      console.error('Profile save error:', error)
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {existingProfile ? 'Update Your Learning Profile' : 'Create Your Learning Profile'}
        </h2>
        <p className="text-gray-600 mt-2">
          Help us personalize your voice training experience
        </p>
      </div>

      {errors.general && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {errors.general}
        </div>
      )}

      {/* Age Range */}
      <div>
        <label htmlFor="ageRange" className="block text-sm font-medium text-gray-700 mb-1">
          Age Range (Optional)
        </label>
        <select
          id="ageRange"
          name="ageRange"
          value={formData.ageRange}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <option value="">Select age range...</option>
          {AGE_RANGES.map((range) => (
            <option key={range.value} value={range.value}>{range.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          This helps us recommend age-appropriate teaching methods
        </p>
      </div>

      {/* Experience Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Current Experience Level *
        </label>
        <div className="space-y-3">
          {EXPERIENCE_LEVELS.map((level) => (
            <label
              key={level.value}
              className={`
                flex items-start p-4 border rounded-lg cursor-pointer transition-all
                ${formData.experienceLevel === level.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <input
                type="radio"
                name="experienceLevel"
                value={level.value}
                checked={formData.experienceLevel === level.value}
                onChange={handleInputChange}
                className="mt-1 text-blue-600"
                disabled={loading}
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">{level.label}</div>
                <div className="text-sm text-gray-600">{level.description}</div>
              </div>
            </label>
          ))}
        </div>
        {errors.experienceLevel && (
          <p className="mt-1 text-sm text-red-600">{errors.experienceLevel}</p>
        )}
      </div>

      {/* Voice Type */}
      <div>
        <label htmlFor="voiceType" className="block text-sm font-medium text-gray-700 mb-1">
          Voice Type (Optional)
        </label>
        <select
          id="voiceType"
          name="voiceType"
          value={formData.voiceType}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <option value="">Select voice type...</option>
          {voiceTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label} - {type.description}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          If you're not sure, your teacher can help determine this during lessons
        </p>
      </div>

      {/* Learning Goals */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Your Learning Goals *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {commonGoals.map((goal) => (
            <label
              key={goal.value}
              className={`
                flex items-start p-3 border rounded-lg cursor-pointer transition-all text-sm
                ${formData.goals.includes(goal.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <input
                type="checkbox"
                checked={formData.goals.includes(goal.value)}
                onChange={() => handleMultiSelectChange('goals', goal.value)}
                className="mt-0.5 text-blue-600"
                disabled={loading}
              />
              <div className="ml-2">
                <div className="font-medium text-gray-900">{goal.label}</div>
                <div className="text-xs text-gray-500 capitalize">{goal.category}</div>
              </div>
            </label>
          ))}
        </div>
        {errors.goals && (
          <p className="mt-1 text-sm text-red-600">{errors.goals}</p>
        )}
      </div>

      {/* Preferred Genres */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Preferred Musical Genres *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {commonGenres.map((genre) => (
            <label
              key={genre.value}
              className={`
                flex items-center p-2 border rounded-lg cursor-pointer transition-all text-sm
                ${formData.preferredGenres.includes(genre.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <input
                type="checkbox"
                checked={formData.preferredGenres.includes(genre.value)}
                onChange={() => handleMultiSelectChange('preferredGenres', genre.value)}
                className="text-blue-600"
                disabled={loading}
              />
              <span className="ml-2">{genre.label}</span>
            </label>
          ))}
        </div>
        {errors.preferredGenres && (
          <p className="mt-1 text-sm text-red-600">{errors.preferredGenres}</p>
        )}
      </div>

      {/* Learning Preferences */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How You Learn Best *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {learningPreferences.map((pref) => (
            <label
              key={pref.value}
              className={`
                flex items-start p-3 border rounded-lg cursor-pointer transition-all text-sm
                ${formData.learningPreferences.includes(pref.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <input
                type="checkbox"
                checked={formData.learningPreferences.includes(pref.value)}
                onChange={() => handleMultiSelectChange('learningPreferences', pref.value)}
                className="mt-0.5 text-blue-600"
                disabled={loading}
              />
              <div className="ml-2">
                <div className="font-medium text-gray-900">{pref.label}</div>
                <div className="text-xs text-gray-600">{pref.description}</div>
              </div>
            </label>
          ))}
        </div>
        {errors.learningPreferences && (
          <p className="mt-1 text-sm text-red-600">{errors.learningPreferences}</p>
        )}
      </div>

      {/* Practice Frequency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How Often Do You Practice?
        </label>
        <div className="space-y-2">
          {PRACTICE_FREQUENCIES.map((freq) => (
            <label
              key={freq.value}
              className={`
                flex items-start p-3 border rounded-lg cursor-pointer transition-all
                ${formData.practiceFrequency === freq.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <input
                type="radio"
                name="practiceFrequency"
                value={freq.value}
                checked={formData.practiceFrequency === freq.value}
                onChange={handleInputChange}
                className="mt-1 text-blue-600"
                disabled={loading}
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">{freq.label}</div>
                <div className="text-sm text-gray-600">{freq.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Physical Limitations */}
      <div>
        <label htmlFor="physicalLimitations" className="block text-sm font-medium text-gray-700 mb-1">
          Physical Limitations or Considerations (Optional)
        </label>
        <textarea
          id="physicalLimitations"
          name="physicalLimitations"
          value={formData.physicalLimitations}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any physical conditions, injuries, or limitations that might affect your voice training..."
          disabled={loading}
        />
        <p className="mt-1 text-xs text-gray-500">
          This information helps your teacher adapt lessons to your needs
        </p>
      </div>

      {/* Accessibility Needs */}
      <div>
        <label htmlFor="accessibilityNeeds" className="block text-sm font-medium text-gray-700 mb-1">
          Accessibility Needs (Optional)
        </label>
        <textarea
          id="accessibilityNeeds"
          name="accessibilityNeeds"
          value={formData.accessibilityNeeds}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any accessibility accommodations you need for lessons..."
          disabled={loading}
        />
        <p className="mt-1 text-xs text-gray-500">
          We're committed to making voice training accessible to everyone
        </p>
      </div>

      {/* Timezone */}
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
          Your Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          value={formData.timezone}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Chicago">Central Time (CT)</option>
          <option value="America/Denver">Mountain Time (MT)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
          <option value="Europe/London">London (GMT)</option>
          <option value="Europe/Paris">Central European Time</option>
          <option value="Asia/Tokyo">Japan Time</option>
          <option value="Asia/Shanghai">China Time</option>
          <option value="Australia/Sydney">Australian Eastern Time</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          This helps teachers understand your availability
        </p>
      </div>

      {/* Submit buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="px-8"
        >
          {loading 
            ? 'Saving...' 
            : existingProfile 
              ? 'Update Profile' 
              : 'Create Profile'
          }
        </Button>
      </div>
    </form>
  )
}