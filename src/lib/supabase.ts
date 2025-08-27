import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

// Database type definitions
export type UserRole = 'student' | 'teacher' | 'admin'
export type TeacherSpecialization = 
  | 'classical' | 'opera' | 'pop_rock' | 'musical_theatre' | 'jazz' 
  | 'country' | 'r_and_b' | 'gospel' | 'folk' | 'speech_therapy' 
  | 'accent_reduction' | 'voice_over' | 'choral' | 'other'
export type CredentialStatus = 'pending' | 'verified' | 'rejected'
export type ProfileCompletionStatus = 'incomplete' | 'basic' | 'complete'

export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  avatar_url?: string
  role: UserRole
  profile_completion: ProfileCompletionStatus
  onboarding_completed: boolean
  terms_accepted: boolean
  privacy_policy_accepted: boolean
  marketing_emails_consent: boolean
  created_at: string
  updated_at: string
  last_login_at?: string
}

export interface TeacherProfile {
  id: string
  bio?: string
  specializations: TeacherSpecialization[]
  years_experience?: number
  hourly_rate_min?: number
  hourly_rate_max?: number
  timezone: string
  languages: string[]
  teaching_philosophy?: string
  availability_notes?: string
  credentials_verified: boolean
  public_profile: boolean
  accepts_new_students: boolean
}

export interface TeacherCredential {
  id: string
  teacher_id: string
  credential_type: string
  institution: string
  credential_name: string
  year_obtained?: number
  document_url?: string
  verification_status: CredentialStatus
  verified_at?: string
  verified_by?: string
  notes?: string
  created_at: string
}

export interface StudentProfile {
  id: string
  age_range?: string
  experience_level: string
  goals: string[]
  preferred_genres: string[]
  voice_type?: string
  physical_limitations?: string
  accessibility_needs?: string
  learning_preferences: string[]
  practice_frequency?: string
  timezone: string
  lessons_completed: number
  practice_minutes_total: number
  last_practice_date?: string
  skill_assessments: Record<string, any>
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile
        Insert: Partial<UserProfile>
        Update: Partial<UserProfile>
      }
      teacher_profiles: {
        Row: TeacherProfile
        Insert: Partial<TeacherProfile>
        Update: Partial<TeacherProfile>
      }
      teacher_credentials: {
        Row: TeacherCredential
        Insert: Partial<TeacherCredential>
        Update: Partial<TeacherCredential>
      }
      student_profiles: {
        Row: StudentProfile
        Insert: Partial<StudentProfile>
        Update: Partial<StudentProfile>
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Only create client if both URL and key are provided
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey) 
  : null

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabase)
}

// Type-safe client
export type TypedSupabaseClient = SupabaseClient<Database>