import { supabase, TeacherProfile, TeacherCredential, TeacherSpecialization } from '../lib/supabase'

export interface CreateTeacherProfileData {
  userId: string
  bio?: string
  specializations: TeacherSpecialization[]
  yearsExperience?: number
  hourlyRateMin?: number
  hourlyRateMax?: number
  timezone?: string
  languages?: string[]
  teachingPhilosophy?: string
  availabilityNotes?: string
  acceptsNewStudents?: boolean
}

export interface UpdateTeacherProfileData {
  bio?: string
  specializations?: TeacherSpecialization[]
  yearsExperience?: number
  hourlyRateMin?: number
  hourlyRateMax?: number
  timezone?: string
  languages?: string[]
  teachingPhilosophy?: string
  availabilityNotes?: string
  publicProfile?: boolean
  acceptsNewStudents?: boolean
}

export interface CreateCredentialData {
  teacherId: string
  credentialType: string
  institution: string
  credentialName: string
  yearObtained?: number
  documentUrl?: string
  notes?: string
}

export interface TeacherProfileResponse {
  success: boolean
  error?: string
  profile?: TeacherProfile
}

export interface CredentialsResponse {
  success: boolean
  error?: string
  credentials?: TeacherCredential[]
  credential?: TeacherCredential
}

export class TeacherProfileService {
  static async createProfile(data: CreateTeacherProfileData): Promise<TeacherProfileResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Validate required fields
      if (!data.userId) {
        return { success: false, error: 'User ID is required' }
      }

      if (!data.specializations || data.specializations.length === 0) {
        return { success: false, error: 'At least one specialization is required' }
      }

      if (data.hourlyRateMin !== undefined && data.hourlyRateMax !== undefined) {
        if (data.hourlyRateMin > data.hourlyRateMax) {
          return { success: false, error: 'Minimum rate cannot be higher than maximum rate' }
        }
      }

      const profileData = {
        id: data.userId,
        bio: data.bio || null,
        specializations: data.specializations,
        years_experience: data.yearsExperience || null,
        hourly_rate_min: data.hourlyRateMin || null,
        hourly_rate_max: data.hourlyRateMax || null,
        timezone: data.timezone || 'UTC',
        languages: data.languages || ['English'],
        teaching_philosophy: data.teachingPhilosophy || null,
        availability_notes: data.availabilityNotes || null,
        credentials_verified: false,
        public_profile: false, // Start with private profile
        accepts_new_students: data.acceptsNewStudents !== false
      }

      const { data: profile, error } = await supabase
        .from('teacher_profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) {
        console.error('Teacher profile creation error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, profile }
    } catch (error) {
      console.error('Teacher profile creation error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async getProfile(userId: string): Promise<TeacherProfileResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { data: profile, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist
          return { success: false, error: 'Teacher profile not found' }
        }
        return { success: false, error: error.message }
      }

      return { success: true, profile }
    } catch (error) {
      console.error('Get teacher profile error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async updateProfile(userId: string, updates: UpdateTeacherProfileData): Promise<TeacherProfileResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Validate rates if provided
      if (updates.hourlyRateMin !== undefined && updates.hourlyRateMax !== undefined) {
        if (updates.hourlyRateMin > updates.hourlyRateMax) {
          return { success: false, error: 'Minimum rate cannot be higher than maximum rate' }
        }
      }

      const updateData: any = {}
      
      // Map updates to database fields
      if (updates.bio !== undefined) updateData.bio = updates.bio
      if (updates.specializations !== undefined) updateData.specializations = updates.specializations
      if (updates.yearsExperience !== undefined) updateData.years_experience = updates.yearsExperience
      if (updates.hourlyRateMin !== undefined) updateData.hourly_rate_min = updates.hourlyRateMin
      if (updates.hourlyRateMax !== undefined) updateData.hourly_rate_max = updates.hourlyRateMax
      if (updates.timezone !== undefined) updateData.timezone = updates.timezone
      if (updates.languages !== undefined) updateData.languages = updates.languages
      if (updates.teachingPhilosophy !== undefined) updateData.teaching_philosophy = updates.teachingPhilosophy
      if (updates.availabilityNotes !== undefined) updateData.availability_notes = updates.availabilityNotes
      if (updates.publicProfile !== undefined) updateData.public_profile = updates.publicProfile
      if (updates.acceptsNewStudents !== undefined) updateData.accepts_new_students = updates.acceptsNewStudents

      const { data: profile, error } = await supabase
        .from('teacher_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, profile }
    } catch (error) {
      console.error('Update teacher profile error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async deleteProfile(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase
        .from('teacher_profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Delete teacher profile error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  // Credential management methods
  static async addCredential(data: CreateCredentialData): Promise<CredentialsResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      if (!data.teacherId || !data.credentialType || !data.institution || !data.credentialName) {
        return { success: false, error: 'Teacher ID, credential type, institution, and credential name are required' }
      }

      const credentialData = {
        teacher_id: data.teacherId,
        credential_type: data.credentialType,
        institution: data.institution,
        credential_name: data.credentialName,
        year_obtained: data.yearObtained || null,
        document_url: data.documentUrl || null,
        verification_status: 'pending' as const,
        notes: data.notes || null
      }

      const { data: credential, error } = await supabase
        .from('teacher_credentials')
        .insert(credentialData)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, credential }
    } catch (error) {
      console.error('Add credential error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async getCredentials(teacherId: string): Promise<CredentialsResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { data: credentials, error } = await supabase
        .from('teacher_credentials')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, credentials: credentials || [] }
    } catch (error) {
      console.error('Get credentials error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async updateCredential(
    credentialId: string, 
    updates: Partial<CreateCredentialData>
  ): Promise<CredentialsResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const updateData: any = {}
      
      if (updates.credentialType !== undefined) updateData.credential_type = updates.credentialType
      if (updates.institution !== undefined) updateData.institution = updates.institution
      if (updates.credentialName !== undefined) updateData.credential_name = updates.credentialName
      if (updates.yearObtained !== undefined) updateData.year_obtained = updates.yearObtained
      if (updates.documentUrl !== undefined) updateData.document_url = updates.documentUrl
      if (updates.notes !== undefined) updateData.notes = updates.notes

      const { data: credential, error } = await supabase
        .from('teacher_credentials')
        .update(updateData)
        .eq('id', credentialId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, credential }
    } catch (error) {
      console.error('Update credential error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async deleteCredential(credentialId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase
        .from('teacher_credentials')
        .delete()
        .eq('id', credentialId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Delete credential error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  // Utility methods
  static async getAllPublicProfiles(): Promise<TeacherProfileResponse & { profiles?: TeacherProfile[] }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { data: profiles, error } = await supabase
        .from('teacher_profiles')
        .select(`
          *,
          user_profiles!inner (
            first_name,
            last_name,
            display_name,
            avatar_url
          )
        `)
        .eq('public_profile', true)
        .eq('accepts_new_students', true)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, profiles: profiles || [] }
    } catch (error) {
      console.error('Get public profiles error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async searchProfiles(
    specialization?: TeacherSpecialization,
    minRate?: number,
    maxRate?: number,
    language?: string
  ): Promise<TeacherProfileResponse & { profiles?: TeacherProfile[] }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      let query = supabase
        .from('teacher_profiles')
        .select(`
          *,
          user_profiles!inner (
            first_name,
            last_name,
            display_name,
            avatar_url
          )
        `)
        .eq('public_profile', true)
        .eq('accepts_new_students', true)

      if (specialization) {
        query = query.contains('specializations', [specialization])
      }

      if (minRate !== undefined) {
        query = query.gte('hourly_rate_min', minRate)
      }

      if (maxRate !== undefined) {
        query = query.lte('hourly_rate_max', maxRate)
      }

      if (language) {
        query = query.contains('languages', [language])
      }

      const { data: profiles, error } = await query.order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, profiles: profiles || [] }
    } catch (error) {
      console.error('Search profiles error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }
}