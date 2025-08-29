'use client'

import React, { useState, useEffect } from 'react'
import { TeacherProfileService, CreateTeacherProfileData, UpdateTeacherProfileData } from '../../services/teacherProfileService'
import { TeacherProfile, TeacherSpecialization } from '../../lib/supabase'
import { Button } from '../ui/Button'

interface TeacherProfileFormProps {
  userId: string
  existingProfile?: TeacherProfile
  onSuccess?: (profile: TeacherProfile) => void
  onCancel?: () => void
}

const SPECIALIZATION_OPTIONS: { value: TeacherSpecialization; label: string; description: string }[] = [
  { value: 'classical', label: 'Classical', description: 'Traditional vocal techniques and repertoire' },
  { value: 'opera', label: 'Opera', description: 'Operatic training and performance' },
  { value: 'pop_rock', label: 'Pop/Rock', description: 'Contemporary popular music styles' },
  { value: 'musical_theatre', label: 'Musical Theatre', description: 'Broadway and stage performance' },
  { value: 'jazz', label: 'Jazz', description: 'Jazz vocals and improvisation' },
  { value: 'country', label: 'Country', description: 'Country music vocal techniques' },
  { value: 'r_and_b', label: 'R&B/Soul', description: 'R&B, soul, and contemporary urban styles' },
  { value: 'gospel', label: 'Gospel', description: 'Gospel and spiritual music' },
  { value: 'folk', label: 'Folk', description: 'Folk and traditional music' },
  { value: 'speech_therapy', label: 'Speech Therapy', description: 'Voice rehabilitation and therapy' },
  { value: 'accent_reduction', label: 'Accent Reduction', description: 'Accent modification and clarity' },
  { value: 'voice_over', label: 'Voice Over', description: 'Commercial and narration work' },
  { value: 'choral', label: 'Choral', description: 'Choir and ensemble singing' },
  { value: 'other', label: 'Other', description: 'Other specializations' }
]

const COMMON_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
  'Chinese (Mandarin)', 'Japanese', 'Korean', 'Russian', 'Arabic'
]

export const TeacherProfileForm: React.FC<TeacherProfileFormProps> = ({
  userId,
  existingProfile,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    bio: existingProfile?.bio || '',
    specializations: existingProfile?.specializations || [] as TeacherSpecialization[],
    yearsExperience: existingProfile?.years_experience || 0,
    hourlyRateMin: existingProfile?.hourly_rate_min || 0,
    hourlyRateMax: existingProfile?.hourly_rate_max || 0,
    timezone: existingProfile?.timezone || 'UTC',
    languages: existingProfile?.languages || ['English'],
    teachingPhilosophy: existingProfile?.teaching_philosophy || '',
    availabilityNotes: existingProfile?.availability_notes || '',
    acceptsNewStudents: existingProfile?.accepts_new_students !== false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [customLanguage, setCustomLanguage] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSpecializationChange = (specialization: TeacherSpecialization) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }))

    if (errors.specializations) {
      setErrors(prev => ({ ...prev, specializations: '' }))
    }
  }

  const handleLanguageToggle = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }))
  }

  const handleAddCustomLanguage = () => {
    if (customLanguage.trim() && !formData.languages.includes(customLanguage.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, customLanguage.trim()]
      }))
      setCustomLanguage('')
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (formData.specializations.length === 0) {
      newErrors.specializations = 'Please select at least one specialization'
    }

    if (formData.bio.length > 1000) {
      newErrors.bio = 'Bio must be 1000 characters or less'
    }

    if (formData.teachingPhilosophy.length > 500) {
      newErrors.teachingPhilosophy = 'Teaching philosophy must be 500 characters or less'
    }

    if (formData.yearsExperience < 0 || formData.yearsExperience > 80) {
      newErrors.yearsExperience = 'Years of experience must be between 0 and 80'
    }

    if (formData.hourlyRateMin < 0 || formData.hourlyRateMax < 0) {
      newErrors.rates = 'Rates must be positive numbers'
    }

    if (formData.hourlyRateMin > formData.hourlyRateMax && formData.hourlyRateMax > 0) {
      newErrors.rates = 'Minimum rate cannot be higher than maximum rate'
    }

    if (formData.languages.length === 0) {
      newErrors.languages = 'Please select at least one language'
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
        const updateData: UpdateTeacherProfileData = {
          bio: formData.bio || undefined,
          specializations: formData.specializations,
          yearsExperience: formData.yearsExperience || undefined,
          hourlyRateMin: formData.hourlyRateMin || undefined,
          hourlyRateMax: formData.hourlyRateMax || undefined,
          timezone: formData.timezone,
          languages: formData.languages,
          teachingPhilosophy: formData.teachingPhilosophy || undefined,
          availabilityNotes: formData.availabilityNotes || undefined,
          acceptsNewStudents: formData.acceptsNewStudents
        }

        result = await TeacherProfileService.updateProfile(userId, updateData)
      } else {
        // Create new profile
        const createData: CreateTeacherProfileData = {
          userId,
          bio: formData.bio || undefined,
          specializations: formData.specializations,
          yearsExperience: formData.yearsExperience || undefined,
          hourlyRateMin: formData.hourlyRateMin || undefined,
          hourlyRateMax: formData.hourlyRateMax || undefined,
          timezone: formData.timezone,
          languages: formData.languages,
          teachingPhilosophy: formData.teachingPhilosophy || undefined,
          availabilityNotes: formData.availabilityNotes || undefined,
          acceptsNewStudents: formData.acceptsNewStudents
        }

        result = await TeacherProfileService.createProfile(createData)
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
          {existingProfile ? 'Update Your Teaching Profile' : 'Create Your Teaching Profile'}
        </h2>
        <p className="text-gray-600 mt-2">
          Share your expertise and help students find you
        </p>
      </div>

      {errors.general && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {errors.general}
        </div>
      )}

      {/* Specializations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Teaching Specializations *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SPECIALIZATION_OPTIONS.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSpecializationChange(option.value)}
              className={`
                p-3 border rounded-lg cursor-pointer transition-all
                ${formData.specializations.includes(option.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.specializations.includes(option.value)}
                  onChange={() => {}} // Controlled by div click
                  className="text-blue-600"
                  tabIndex={-1}
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-600">{option.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {errors.specializations && (
          <p className="mt-1 text-sm text-red-600">{errors.specializations}</p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          Professional Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.bio ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
          }`}
          placeholder="Tell students about your background, experience, and what makes you unique as a voice teacher..."
          disabled={loading}
        />
        <div className="flex justify-between mt-1">
          {errors.bio && <p className="text-sm text-red-600">{errors.bio}</p>}
          <p className="text-sm text-gray-500 ml-auto">{formData.bio.length}/1000</p>
        </div>
      </div>

      {/* Experience and Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-1">
            Years of Experience
          </label>
          <input
            type="number"
            id="yearsExperience"
            name="yearsExperience"
            value={formData.yearsExperience}
            onChange={handleInputChange}
            min="0"
            max="80"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.yearsExperience ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {errors.yearsExperience && (
            <p className="mt-1 text-sm text-red-600">{errors.yearsExperience}</p>
          )}
        </div>

        <div>
          <label htmlFor="hourlyRateMin" className="block text-sm font-medium text-gray-700 mb-1">
            Min Rate ($/hour)
          </label>
          <input
            type="number"
            id="hourlyRateMin"
            name="hourlyRateMin"
            value={formData.hourlyRateMin}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.rates ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="hourlyRateMax" className="block text-sm font-medium text-gray-700 mb-1">
            Max Rate ($/hour)
          </label>
          <input
            type="number"
            id="hourlyRateMax"
            name="hourlyRateMax"
            value={formData.hourlyRateMax}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.rates ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
        </div>
      </div>
      {errors.rates && (
        <p className="text-sm text-red-600">{errors.rates}</p>
      )}

      {/* Languages */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Languages You Teach In *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
          {COMMON_LANGUAGES.map((language) => (
            <label key={language} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={formData.languages.includes(language)}
                onChange={() => handleLanguageToggle(language)}
                className="text-blue-600"
              />
              <span>{language}</span>
            </label>
          ))}
        </div>

        {/* Custom language input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={customLanguage}
            onChange={(e) => setCustomLanguage(e.target.value)}
            placeholder="Add another language"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustomLanguage()
              }
            }}
          />
          <Button
            type="button"
            onClick={handleAddCustomLanguage}
            variant="secondary"
            disabled={!customLanguage.trim()}
          >
            Add
          </Button>
        </div>

        {/* Selected languages */}
        {formData.languages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.languages.map((language) => (
              <span
                key={language}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {language}
                <button
                  type="button"
                  onClick={() => handleLanguageToggle(language)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.languages && (
          <p className="mt-1 text-sm text-red-600">{errors.languages}</p>
        )}
      </div>

      {/* Teaching Philosophy */}
      <div>
        <label htmlFor="teachingPhilosophy" className="block text-sm font-medium text-gray-700 mb-1">
          Teaching Philosophy & Approach
        </label>
        <textarea
          id="teachingPhilosophy"
          name="teachingPhilosophy"
          value={formData.teachingPhilosophy}
          onChange={handleInputChange}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.teachingPhilosophy ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
          }`}
          placeholder="Describe your teaching style, methodology, and what students can expect from lessons with you..."
          disabled={loading}
        />
        <div className="flex justify-between mt-1">
          {errors.teachingPhilosophy && <p className="text-sm text-red-600">{errors.teachingPhilosophy}</p>}
          <p className="text-sm text-gray-500 ml-auto">{formData.teachingPhilosophy.length}/500</p>
        </div>
      </div>

      {/* Availability Notes */}
      <div>
        <label htmlFor="availabilityNotes" className="block text-sm font-medium text-gray-700 mb-1">
          Availability Notes
        </label>
        <textarea
          id="availabilityNotes"
          name="availabilityNotes"
          value={formData.availabilityNotes}
          onChange={handleInputChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Let students know about your typical availability, preferred lesson times, or scheduling preferences..."
          disabled={loading}
        />
      </div>

      {/* Timezone */}
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
          Timezone
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
      </div>

      {/* Accept New Students */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="acceptsNewStudents"
          name="acceptsNewStudents"
          checked={formData.acceptsNewStudents}
          onChange={handleInputChange}
          className="text-blue-600"
          disabled={loading}
        />
        <label htmlFor="acceptsNewStudents" className="text-sm text-gray-700">
          Currently accepting new students
        </label>
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