import { UserRole } from './supabase'

export interface UserJourneyStep {
  id: string
  title: string
  description: string
  completed: boolean
  required: boolean
  estimatedMinutes?: number
}

export interface RoleSpecificJourney {
  role: UserRole
  title: string
  description: string
  steps: UserJourneyStep[]
  completionMessage: string
}

// Define onboarding journey for students
const studentJourney: RoleSpecificJourney = {
  role: 'student',
  title: 'Student Onboarding',
  description: 'Complete your profile to get personalized voice training recommendations',
  steps: [
    {
      id: 'email_verification',
      title: 'Verify Email',
      description: 'Confirm your email address to secure your account',
      completed: false,
      required: true,
      estimatedMinutes: 2
    },
    {
      id: 'basic_profile',
      title: 'Basic Profile',
      description: 'Add your name and basic information',
      completed: false,
      required: true,
      estimatedMinutes: 3
    },
    {
      id: 'learning_assessment',
      title: 'Learning Assessment',
      description: 'Tell us about your experience level and goals',
      completed: false,
      required: true,
      estimatedMinutes: 5
    },
    {
      id: 'voice_goals',
      title: 'Voice Training Goals',
      description: 'Define what you want to achieve with voice training',
      completed: false,
      required: true,
      estimatedMinutes: 3
    },
    {
      id: 'preferences',
      title: 'Learning Preferences',
      description: 'Set your schedule and communication preferences',
      completed: false,
      required: false,
      estimatedMinutes: 4
    },
    {
      id: 'browse_teachers',
      title: 'Browse Teachers',
      description: 'Explore available voice teachers and their specializations',
      completed: false,
      required: false,
      estimatedMinutes: 10
    }
  ],
  completionMessage: 'Great! Your student profile is complete. You can now browse teachers and start your voice training journey!'
}

// Define onboarding journey for teachers
const teacherJourney: RoleSpecificJourney = {
  role: 'teacher',
  title: 'Teacher Onboarding',
  description: 'Set up your teaching profile to attract students and start building your practice',
  steps: [
    {
      id: 'email_verification',
      title: 'Verify Email',
      description: 'Confirm your email address to secure your account',
      completed: false,
      required: true,
      estimatedMinutes: 2
    },
    {
      id: 'basic_profile',
      title: 'Basic Profile',
      description: 'Add your name and professional information',
      completed: false,
      required: true,
      estimatedMinutes: 5
    },
    {
      id: 'specializations',
      title: 'Teaching Specializations',
      description: 'Define your areas of expertise and teaching focus',
      completed: false,
      required: true,
      estimatedMinutes: 7
    },
    {
      id: 'credentials',
      title: 'Add Credentials',
      description: 'Upload your certifications, degrees, and achievements',
      completed: false,
      required: true,
      estimatedMinutes: 10
    },
    {
      id: 'teaching_philosophy',
      title: 'Teaching Philosophy',
      description: 'Share your approach to voice training and student development',
      completed: false,
      required: true,
      estimatedMinutes: 8
    },
    {
      id: 'pricing_availability',
      title: 'Rates & Availability',
      description: 'Set your hourly rates and teaching schedule',
      completed: false,
      required: true,
      estimatedMinutes: 6
    },
    {
      id: 'profile_review',
      title: 'Profile Review',
      description: 'Review your complete profile before going live',
      completed: false,
      required: false,
      estimatedMinutes: 5
    }
  ],
  completionMessage: 'Excellent! Your teaching profile is ready. Students can now discover you and book lessons!'
}

export class UserJourneyTracker {
  private static getStorageKey(userId: string): string {
    return `user_journey_${userId}`
  }

  static getJourneyForRole(role: UserRole): RoleSpecificJourney {
    switch (role) {
      case 'student':
        return { ...studentJourney }
      case 'teacher':
        return { ...teacherJourney }
      default:
        return { ...studentJourney } // Default to student journey
    }
  }

  static saveJourneyProgress(userId: string, journey: RoleSpecificJourney): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(
        this.getStorageKey(userId), 
        JSON.stringify(journey)
      )
    } catch (error) {
      console.error('Failed to save journey progress:', error)
    }
  }

  static loadJourneyProgress(userId: string, role: UserRole): RoleSpecificJourney {
    if (typeof window === 'undefined') return this.getJourneyForRole(role)

    try {
      const stored = localStorage.getItem(this.getStorageKey(userId))
      if (stored) {
        const parsed = JSON.parse(stored) as RoleSpecificJourney
        // Merge with default to ensure we have all steps
        const defaultJourney = this.getJourneyForRole(role)
        return {
          ...defaultJourney,
          steps: defaultJourney.steps.map(defaultStep => {
            const savedStep = parsed.steps.find(s => s.id === defaultStep.id)
            return savedStep ? { ...defaultStep, completed: savedStep.completed } : defaultStep
          })
        }
      }
    } catch (error) {
      console.error('Failed to load journey progress:', error)
    }

    return this.getJourneyForRole(role)
  }

  static markStepCompleted(userId: string, role: UserRole, stepId: string): RoleSpecificJourney {
    const journey = this.loadJourneyProgress(userId, role)
    
    journey.steps = journey.steps.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    )
    
    this.saveJourneyProgress(userId, journey)
    return journey
  }

  static getNextIncompleteStep(journey: RoleSpecificJourney): UserJourneyStep | null {
    return journey.steps.find(step => !step.completed && step.required) || 
           journey.steps.find(step => !step.completed) || 
           null
  }

  static getCompletionStats(journey: RoleSpecificJourney): {
    completed: number
    total: number
    requiredCompleted: number
    requiredTotal: number
    percentage: number
    requiredPercentage: number
  } {
    const completed = journey.steps.filter(step => step.completed).length
    const total = journey.steps.length
    const requiredSteps = journey.steps.filter(step => step.required)
    const requiredCompleted = requiredSteps.filter(step => step.completed).length
    const requiredTotal = requiredSteps.length

    return {
      completed,
      total,
      requiredCompleted,
      requiredTotal,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      requiredPercentage: requiredTotal > 0 ? Math.round((requiredCompleted / requiredTotal) * 100) : 0
    }
  }

  static isOnboardingComplete(journey: RoleSpecificJourney): boolean {
    const stats = this.getCompletionStats(journey)
    return stats.requiredCompleted === stats.requiredTotal
  }

  static getEstimatedTimeToComplete(journey: RoleSpecificJourney): number {
    return journey.steps
      .filter(step => !step.completed)
      .reduce((total, step) => total + (step.estimatedMinutes || 0), 0)
  }

  static clearJourneyProgress(userId: string): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(this.getStorageKey(userId))
    } catch (error) {
      console.error('Failed to clear journey progress:', error)
    }
  }
}

// Utility functions for journey management
export const getJourneyStep = (journey: RoleSpecificJourney, stepId: string): UserJourneyStep | undefined => {
  return journey.steps.find(step => step.id === stepId)
}

export const formatEstimatedTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
  
  return `${hours}h ${remainingMinutes}m`
}

// Helper to determine next action based on journey state
export const getNextActionForUser = (journey: RoleSpecificJourney): {
  action: 'complete-step' | 'browse' | 'dashboard'
  step?: UserJourneyStep
  message: string
} => {
  const nextStep = UserJourneyTracker.getNextIncompleteStep(journey)
  const isComplete = UserJourneyTracker.isOnboardingComplete(journey)

  if (!isComplete && nextStep) {
    return {
      action: 'complete-step',
      step: nextStep,
      message: `Complete "${nextStep.title}" to continue your onboarding`
    }
  }

  if (journey.role === 'student') {
    return {
      action: 'browse',
      message: 'Browse available teachers and start your voice training journey!'
    }
  } else {
    return {
      action: 'dashboard',
      message: 'Your profile is complete! Students can now find and book lessons with you.'
    }
  }
}