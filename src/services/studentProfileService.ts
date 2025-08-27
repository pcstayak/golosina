import { supabase, StudentProfile } from '../lib/supabase'

export interface CreateStudentProfileData {
  userId: string
  ageRange?: string
  experienceLevel: string
  goals?: string[]
  preferredGenres?: string[]
  voiceType?: string
  physicalLimitations?: string
  accessibilityNeeds?: string
  learningPreferences?: string[]
  practiceFrequency?: string
  timezone?: string
}

export interface UpdateStudentProfileData {
  ageRange?: string
  experienceLevel?: string
  goals?: string[]
  preferredGenres?: string[]
  voiceType?: string
  physicalLimitations?: string
  accessibilityNeeds?: string
  learningPreferences?: string[]
  practiceFrequency?: string
  timezone?: string
  skillAssessments?: Record<string, any>
}

export interface StudentProfileResponse {
  success: boolean
  error?: string
  profile?: StudentProfile
}

export interface SkillAssessment {
  category: string
  level: number // 1-5 scale
  confidence: number // 1-5 scale
  notes?: string
  assessedAt: string
}

export interface LearningGoal {
  id: string
  title: string
  description: string
  category: string
  priority: 'high' | 'medium' | 'low'
  targetDate?: string
  completed: boolean
  createdAt: string
}

export class StudentProfileService {
  static async createProfile(data: CreateStudentProfileData): Promise<StudentProfileResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      if (!data.userId) {
        return { success: false, error: 'User ID is required' }
      }

      if (!data.experienceLevel) {
        return { success: false, error: 'Experience level is required' }
      }

      const profileData = {
        id: data.userId,
        age_range: data.ageRange || null,
        experience_level: data.experienceLevel,
        goals: data.goals || [],
        preferred_genres: data.preferredGenres || [],
        voice_type: data.voiceType || null,
        physical_limitations: data.physicalLimitations || null,
        accessibility_needs: data.accessibilityNeeds || null,
        learning_preferences: data.learningPreferences || [],
        practice_frequency: data.practiceFrequency || null,
        timezone: data.timezone || 'UTC',
        lessons_completed: 0,
        practice_minutes_total: 0,
        skill_assessments: {}
      }

      const { data: profile, error } = await supabase
        .from('student_profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) {
        console.error('Student profile creation error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, profile }
    } catch (error) {
      console.error('Student profile creation error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async getProfile(userId: string): Promise<StudentProfileResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { data: profile, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Student profile not found' }
        }
        return { success: false, error: error.message }
      }

      return { success: true, profile }
    } catch (error) {
      console.error('Get student profile error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async updateProfile(userId: string, updates: UpdateStudentProfileData): Promise<StudentProfileResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const updateData: any = {}

      // Map updates to database fields
      if (updates.ageRange !== undefined) updateData.age_range = updates.ageRange
      if (updates.experienceLevel !== undefined) updateData.experience_level = updates.experienceLevel
      if (updates.goals !== undefined) updateData.goals = updates.goals
      if (updates.preferredGenres !== undefined) updateData.preferred_genres = updates.preferredGenres
      if (updates.voiceType !== undefined) updateData.voice_type = updates.voiceType
      if (updates.physicalLimitations !== undefined) updateData.physical_limitations = updates.physicalLimitations
      if (updates.accessibilityNeeds !== undefined) updateData.accessibility_needs = updates.accessibilityNeeds
      if (updates.learningPreferences !== undefined) updateData.learning_preferences = updates.learningPreferences
      if (updates.practiceFrequency !== undefined) updateData.practice_frequency = updates.practiceFrequency
      if (updates.timezone !== undefined) updateData.timezone = updates.timezone
      if (updates.skillAssessments !== undefined) updateData.skill_assessments = updates.skillAssessments

      const { data: profile, error } = await supabase
        .from('student_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, profile }
    } catch (error) {
      console.error('Update student profile error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async deleteProfile(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase
        .from('student_profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Delete student profile error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  // Skill assessment methods
  static async updateSkillAssessment(
    userId: string, 
    assessments: Record<string, SkillAssessment>
  ): Promise<StudentProfileResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { data: profile, error } = await supabase
        .from('student_profiles')
        .update({ skill_assessments: assessments })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, profile }
    } catch (error) {
      console.error('Update skill assessment error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async recordPracticeSession(
    userId: string, 
    durationMinutes: number
  ): Promise<StudentProfileResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Get current profile to update totals
      const currentProfile = await this.getProfile(userId)
      if (!currentProfile.success || !currentProfile.profile) {
        return { success: false, error: 'Could not find student profile' }
      }

      const updatedMinutes = (currentProfile.profile.practice_minutes_total || 0) + durationMinutes
      const today = new Date().toISOString().split('T')[0]

      const { data: profile, error } = await supabase
        .from('student_profiles')
        .update({ 
          practice_minutes_total: updatedMinutes,
          last_practice_date: today
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, profile }
    } catch (error) {
      console.error('Record practice session error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  static async updateLessonCount(userId: string, increment: number = 1): Promise<StudentProfileResponse> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Get current profile to update count
      const currentProfile = await this.getProfile(userId)
      if (!currentProfile.success || !currentProfile.profile) {
        return { success: false, error: 'Could not find student profile' }
      }

      const updatedCount = (currentProfile.profile.lessons_completed || 0) + increment

      const { data: profile, error } = await supabase
        .from('student_profiles')
        .update({ lessons_completed: updatedCount })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, profile }
    } catch (error) {
      console.error('Update lesson count error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  // Utility methods for assessment
  static getDefaultSkillCategories(): string[] {
    return [
      'breath_support',
      'pitch_accuracy',
      'rhythm_timing',
      'vocal_range',
      'articulation',
      'vocal_agility',
      'expression_emotion',
      'stage_presence',
      'music_reading',
      'ear_training'
    ]
  }

  static getSkillCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      breath_support: 'Breath Support & Control',
      pitch_accuracy: 'Pitch Accuracy',
      rhythm_timing: 'Rhythm & Timing',
      vocal_range: 'Vocal Range',
      articulation: 'Articulation & Diction',
      vocal_agility: 'Vocal Agility & Runs',
      expression_emotion: 'Expression & Emotion',
      stage_presence: 'Stage Presence & Performance',
      music_reading: 'Music Reading',
      ear_training: 'Ear Training & Listening'
    }

    return labels[category] || category
  }

  static getExperienceLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      'absolute_beginner': 'Absolute Beginner',
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced',
      'professional': 'Professional/Semi-Professional'
    }

    return labels[level] || level
  }

  static getCommonGoals(): Array<{ value: string; label: string; category: string }> {
    return [
      { value: 'improve_breath_control', label: 'Improve breath control and support', category: 'technique' },
      { value: 'expand_vocal_range', label: 'Expand vocal range', category: 'technique' },
      { value: 'better_pitch_accuracy', label: 'Sing with better pitch accuracy', category: 'technique' },
      { value: 'learn_new_songs', label: 'Learn new songs and repertoire', category: 'repertoire' },
      { value: 'performance_confidence', label: 'Build performance confidence', category: 'performance' },
      { value: 'stage_presence', label: 'Develop stage presence', category: 'performance' },
      { value: 'audition_prep', label: 'Prepare for auditions', category: 'performance' },
      { value: 'recording_skills', label: 'Improve recording/studio skills', category: 'professional' },
      { value: 'music_theory', label: 'Learn music theory', category: 'education' },
      { value: 'sight_reading', label: 'Improve sight-reading skills', category: 'education' },
      { value: 'vocal_health', label: 'Maintain vocal health', category: 'health' },
      { value: 'overcome_limitations', label: 'Overcome physical limitations', category: 'health' },
      { value: 'genre_specific', label: 'Master a specific genre', category: 'style' },
      { value: 'songwriting', label: 'Learn songwriting', category: 'creative' },
      { value: 'improvisation', label: 'Develop improvisation skills', category: 'creative' }
    ]
  }

  static getCommonGenres(): Array<{ value: string; label: string }> {
    return [
      { value: 'pop', label: 'Pop' },
      { value: 'rock', label: 'Rock' },
      { value: 'r_and_b', label: 'R&B/Soul' },
      { value: 'jazz', label: 'Jazz' },
      { value: 'classical', label: 'Classical' },
      { value: 'opera', label: 'Opera' },
      { value: 'musical_theatre', label: 'Musical Theatre' },
      { value: 'country', label: 'Country' },
      { value: 'folk', label: 'Folk' },
      { value: 'gospel', label: 'Gospel' },
      { value: 'blues', label: 'Blues' },
      { value: 'indie', label: 'Indie' },
      { value: 'electronic', label: 'Electronic' },
      { value: 'world_music', label: 'World Music' }
    ]
  }

  static getVoiceTypes(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'soprano', label: 'Soprano', description: 'Highest female voice type' },
      { value: 'mezzo_soprano', label: 'Mezzo-Soprano', description: 'Middle female voice type' },
      { value: 'alto', label: 'Alto', description: 'Lowest female voice type' },
      { value: 'countertenor', label: 'Countertenor', description: 'Highest male voice type (rare)' },
      { value: 'tenor', label: 'Tenor', description: 'Higher male voice type' },
      { value: 'baritone', label: 'Baritone', description: 'Middle male voice type' },
      { value: 'bass', label: 'Bass', description: 'Lowest male voice type' },
      { value: 'unsure', label: 'Not Sure', description: 'Help me determine my voice type' }
    ]
  }

  static getLearningPreferences(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'visual', label: 'Visual Learning', description: 'Learn through seeing and visual aids' },
      { value: 'auditory', label: 'Auditory Learning', description: 'Learn through listening and sound' },
      { value: 'kinesthetic', label: 'Kinesthetic Learning', description: 'Learn through movement and hands-on practice' },
      { value: 'reading', label: 'Reading/Writing', description: 'Learn through text and written materials' },
      { value: 'social', label: 'Social Learning', description: 'Learn better in group settings' },
      { value: 'solitary', label: 'Independent Learning', description: 'Prefer to learn alone' },
      { value: 'structured', label: 'Structured Approach', description: 'Prefer systematic, step-by-step learning' },
      { value: 'flexible', label: 'Flexible Approach', description: 'Prefer adaptable, varied learning methods' }
    ]
  }
}