'use client'

import React, { useState, useEffect } from 'react'
import { TeacherProfileService, CreateCredentialData } from '../../services/teacherProfileService'
import { TeacherCredential, CredentialStatus } from '../../lib/supabase'
import { Button } from '../ui/Button'

interface CredentialManagerProps {
  teacherId: string
  onCredentialsUpdate?: (credentials: TeacherCredential[]) => void
}

const CREDENTIAL_TYPES = [
  { value: 'degree', label: 'Academic Degree' },
  { value: 'certification', label: 'Professional Certification' },
  { value: 'diploma', label: 'Diploma/Certificate' },
  { value: 'award', label: 'Award/Recognition' },
  { value: 'license', label: 'Professional License' },
  { value: 'other', label: 'Other' }
]

export const CredentialManager: React.FC<CredentialManagerProps> = ({
  teacherId,
  onCredentialsUpdate
}) => {
  const [credentials, setCredentials] = useState<TeacherCredential[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    credentialType: '',
    institution: '',
    credentialName: '',
    yearObtained: new Date().getFullYear(),
    documentUrl: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadCredentials()
  }, [teacherId])

  const loadCredentials = async () => {
    setLoading(true)
    try {
      const result = await TeacherProfileService.getCredentials(teacherId)
      if (result.success && result.credentials) {
        setCredentials(result.credentials)
        onCredentialsUpdate?.(result.credentials)
      }
    } catch (error) {
      console.error('Failed to load credentials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'yearObtained' ? Number(value) : value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.credentialType) {
      newErrors.credentialType = 'Credential type is required'
    }

    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution is required'
    }

    if (!formData.credentialName.trim()) {
      newErrors.credentialName = 'Credential name is required'
    }

    if (formData.yearObtained < 1950 || formData.yearObtained > new Date().getFullYear() + 1) {
      newErrors.yearObtained = 'Please enter a valid year'
    }

    if (formData.documentUrl && !isValidUrl(formData.documentUrl)) {
      newErrors.documentUrl = 'Please enter a valid URL'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const credentialData: CreateCredentialData = {
        teacherId,
        credentialType: formData.credentialType,
        institution: formData.institution.trim(),
        credentialName: formData.credentialName.trim(),
        yearObtained: formData.yearObtained,
        documentUrl: formData.documentUrl.trim() || undefined,
        notes: formData.notes.trim() || undefined
      }

      const result = await TeacherProfileService.addCredential(credentialData)

      if (result.success && result.credential) {
        setCredentials(prev => [result.credential!, ...prev])
        onCredentialsUpdate?.([result.credential!, ...credentials])
        
        // Reset form
        setFormData({
          credentialType: '',
          institution: '',
          credentialName: '',
          yearObtained: new Date().getFullYear(),
          documentUrl: '',
          notes: ''
        })
        setShowAddForm(false)
        setErrors({})
      } else {
        setErrors({ general: result.error || 'Failed to add credential' })
      }
    } catch (error) {
      console.error('Add credential error:', error)
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (credentialId: string) => {
    if (!confirm('Are you sure you want to delete this credential?')) return

    setLoading(true)
    try {
      const result = await TeacherProfileService.deleteCredential(credentialId)
      
      if (result.success) {
        const updatedCredentials = credentials.filter(c => c.id !== credentialId)
        setCredentials(updatedCredentials)
        onCredentialsUpdate?.(updatedCredentials)
      } else {
        alert('Failed to delete credential: ' + result.error)
      }
    } catch (error) {
      console.error('Delete credential error:', error)
      alert('An unexpected error occurred while deleting the credential')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: CredentialStatus) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-100'
      case 'rejected':
        return 'text-red-600 bg-red-100'
      case 'pending':
      default:
        return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getStatusIcon = (status: CredentialStatus) => {
    switch (status) {
      case 'verified':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'rejected':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'pending':
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Credentials & Certifications</h3>
          <p className="text-sm text-gray-600">Add your qualifications to build trust with students</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          disabled={loading}
        >
          Add Credential
        </Button>
      </div>

      {/* Add credential form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Add New Credential</h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {errors.general}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="credentialType" className="block text-sm font-medium text-gray-700 mb-1">
                  Credential Type *
                </label>
                <select
                  id="credentialType"
                  name="credentialType"
                  value={formData.credentialType}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.credentialType ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <option value="">Select type...</option>
                  {CREDENTIAL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {errors.credentialType && (
                  <p className="mt-1 text-sm text-red-600">{errors.credentialType}</p>
                )}
              </div>

              <div>
                <label htmlFor="yearObtained" className="block text-sm font-medium text-gray-700 mb-1">
                  Year Obtained
                </label>
                <input
                  type="number"
                  id="yearObtained"
                  name="yearObtained"
                  value={formData.yearObtained}
                  onChange={handleInputChange}
                  min="1950"
                  max={new Date().getFullYear() + 1}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.yearObtained ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.yearObtained && (
                  <p className="mt-1 text-sm text-red-600">{errors.yearObtained}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="credentialName" className="block text-sm font-medium text-gray-700 mb-1">
                Credential Name *
              </label>
              <input
                type="text"
                id="credentialName"
                name="credentialName"
                value={formData.credentialName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.credentialName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Master of Music in Vocal Performance"
                disabled={loading}
              />
              {errors.credentialName && (
                <p className="mt-1 text-sm text-red-600">{errors.credentialName}</p>
              )}
            </div>

            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">
                Institution *
              </label>
              <input
                type="text"
                id="institution"
                name="institution"
                value={formData.institution}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.institution ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Juilliard School, Berkeley College of Music"
                disabled={loading}
              />
              {errors.institution && (
                <p className="mt-1 text-sm text-red-600">{errors.institution}</p>
              )}
            </div>

            <div>
              <label htmlFor="documentUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Document URL (Optional)
              </label>
              <input
                type="url"
                id="documentUrl"
                name="documentUrl"
                value={formData.documentUrl}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.documentUrl ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="https://..."
                disabled={loading}
              />
              {errors.documentUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.documentUrl}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Link to a digital copy or verification page (optional)
              </p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional details about this credential..."
                disabled={loading}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setErrors({})
                }}
                variant="outline"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Credential'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Credentials list */}
      <div className="space-y-4">
        {credentials.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600">No credentials added yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Add your qualifications to build credibility with potential students
            </p>
          </div>
        ) : (
          credentials.map((credential) => (
            <div key={credential.id} className="bg-white p-4 border rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">{credential.credential_name}</h4>
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(credential.verification_status)}`}>
                      {getStatusIcon(credential.verification_status)}
                      <span className="capitalize">{credential.verification_status}</span>
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Type:</span> {CREDENTIAL_TYPES.find(t => t.value === credential.credential_type)?.label || credential.credential_type}</p>
                    <p><span className="font-medium">Institution:</span> {credential.institution}</p>
                    {credential.year_obtained && (
                      <p><span className="font-medium">Year:</span> {credential.year_obtained}</p>
                    )}
                    {credential.document_url && (
                      <p>
                        <span className="font-medium">Document:</span>{' '}
                        <a 
                          href={credential.document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 underline"
                        >
                          View Document
                        </a>
                      </p>
                    )}
                    {credential.notes && (
                      <p><span className="font-medium">Notes:</span> {credential.notes}</p>
                    )}
                  </div>

                  {credential.verification_status === 'pending' && (
                    <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                      <p>This credential is pending verification. Our team will review it within 3-5 business days.</p>
                    </div>
                  )}

                  {credential.verification_status === 'rejected' && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                      <p>This credential was not approved. Please contact support if you believe this is an error.</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleDelete(credential.id)}
                  variant="ghost"
                  disabled={loading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {credentials.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          <p>
            Verified credentials help build trust with students and increase your profile visibility.
          </p>
        </div>
      )}
    </div>
  )
}