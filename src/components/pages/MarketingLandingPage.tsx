'use client'

import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { AuthModal } from '@/components/auth/AuthModal'
import { 
  Mic, 
  BarChart3, 
  Target, 
  Users, 
  CheckCircle, 
  PlayCircle,
  Volume2,
  Headphones,
  Award,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const MarketingLandingPageComponent: React.FC = () => {
  const searchParams = useSearchParams()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const error = searchParams.get('error')

    if (error) {
      switch (error) {
        case 'invalid_token':
          setErrorMessage('The verification link is invalid or has expired.')
          break
        case 'configuration_error':
          setErrorMessage('Authentication service is not properly configured.')
          break
        case 'authentication_failed':
          setErrorMessage('Authentication failed. Please try again.')
          break
        case 'user_not_found':
          setErrorMessage('User account could not be found.')
          break
        case 'unexpected_error':
          setErrorMessage('An unexpected error occurred. Please try again.')
          break
        default:
          setErrorMessage('An authentication error occurred.')
      }
    }
  }, [searchParams])

  const handleGetStarted = () => {
    setAuthMode('register')
    setShowAuthModal(true)
  }

  const handleLogin = () => {
    setAuthMode('login')
    setShowAuthModal(true)
  }

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  const features = [
    {
      icon: <Mic className="w-8 h-8" />,
      title: "Voice Recording & Playback",
      description: "Record your voice during practice sessions and listen back to track your progress over time."
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Personalized Exercise Sets",
      description: "Customized training programs for breathing, vocal warm-ups, and pitch accuracy based on your goals."
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Simple Progress Tracking",
      description: "Keep track of your practice sessions and build consistent habits with basic session logging."
    },
    {
      icon: <Volume2 className="w-8 h-8" />,
      title: "Auto-Split Recordings",
      description: "Smart silence detection automatically splits your practice sessions for better organization."
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: "Cross-Platform Compatible",
      description: "Works seamlessly across desktop and mobile devices with optimized audio processing."
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Easy to Use",
      description: "Simple, user-friendly interface designed for convenient voice practice anywhere you have a microphone."
    }
  ]

  const userTypes = [
    {
      title: "For Singers",
      icon: "🎤",
      benefits: [
        "Improve pitch accuracy and vocal range",
        "Master breath control techniques",
        "Develop consistent tone quality",
        "Practice scales and intervals effectively"
      ]
    },
    {
      title: "For Speakers",
      icon: "🗣️",
      benefits: [
        "Enhance clarity and articulation",
        "Build confidence in presentation",
        "Improve vocal projection",
        "Reduce vocal fatigue"
      ]
    },
    {
      title: "For Performers",
      icon: "🎭",
      benefits: [
        "Develop stage presence",
        "Master emotional expression",
        "Improve vocal stamina",
        "Perfect character voices"
      ]
    },
    {
      title: "For Students",
      icon: "🎓",
      benefits: [
        "Ace academic presentations",
        "Prepare for interviews",
        "Build public speaking skills",
        "Overcome speech anxiety"
      ]
    }
  ]

  const howItWorks = [
    {
      step: 1,
      title: "Choose Your Goals",
      description: "Select from breathing techniques, vocal warm-ups, or pitch training exercises tailored to your needs.",
      icon: <Target className="w-12 h-12 text-purple-600" />
    },
    {
      step: 2,
      title: "Record & Practice",
      description: "Record your voice during exercises and listen back to hear your progress and identify areas for improvement.",
      icon: <Mic className="w-12 h-12 text-purple-600" />
    },
    {
      step: 3,
      title: "Track Sessions",
      description: "Keep a simple log of your practice sessions to build consistent voice training habits.",
      icon: <BarChart3 className="w-12 h-12 text-purple-600" />
    }
  ]

  const faqs = [
    {
      question: "What equipment do I need to get started?",
      answer: "All you need is a device with a microphone - your computer, smartphone, or tablet will work perfectly. For best results, we recommend using headphones to avoid audio feedback."
    },
    {
      question: "Do I need any singing or speaking experience?",
      answer: "Not at all! Golosina is designed for everyone, from complete beginners to professional performers. Our exercises adapt to your current level and help you progress at your own pace."
    },
    {
      question: "How do the recordings work?",
      answer: "You can record your voice during any exercise and play it back to hear how you sound. This helps you identify areas for improvement and track your progress over time through self-evaluation."
    },
    {
      question: "Can I use this on my mobile device?",
      answer: "Yes! Golosina works seamlessly on desktop computers, tablets, and smartphones. Our mobile-optimized interface ensures you can practice anywhere, anytime."
    },
    {
      question: "Is my voice data private and secure?",
      answer: "Absolutely. Your privacy is our top priority. Voice recordings are processed securely and are only used to provide you with personalized feedback. We never share your data with third parties."
    },
    {
      question: "How often should I practice?",
      answer: "For best results, we recommend short daily sessions of 10-20 minutes. Consistent practice is more effective than longer, infrequent sessions. Our streak tracking helps keep you motivated!"
    }
  ]

  // Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Golosina",
        "url": "https://golosina.net",
        "description": "Voice training tool with exercises and recording capabilities for singers, speakers, and performers",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Web Browser",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "featureList": [
          "Voice recording and playback",
          "Organized exercise sets",
          "Basic session tracking",
          "Cross-platform compatibility",
          "Auto-splitting recordings with silence detection"
        ]
      },
      {
        "@type": "Organization",
        "name": "Golosina",
        "url": "https://golosina.net",
        "logo": "https://golosina.net/logo.png",
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "Customer Service",
          "availableLanguage": "English"
        }
      },
      {
        "@type": "Service",
        "name": "Voice Training",
        "provider": {
          "@type": "Organization",
          "name": "Golosina"
        },
        "description": "Voice training with exercises and recording tools for singers, speakers, performers, and students",
        "serviceType": "Voice Training",
        "areaServed": "Worldwide",
        "availableChannel": {
          "@type": "ServiceChannel",
          "serviceUrl": "https://golosina.net",
          "serviceSmsNumber": null,
          "servicePhone": null
        }
      }
    ]
  }

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen bg-[var(--bg)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[rgba(var(--primary-rgb),0.15)] via-transparent to-[rgba(var(--primary-rgb),0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-[var(--text)] mb-6">
              Master Your Voice with{' '}
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] bg-clip-text text-transparent">
                Practice & Recording
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-[var(--muted)] mb-8 max-w-3xl mx-auto leading-relaxed">
              Practice voice exercises with recording and playback capabilities. Perfect for singers, speakers, performers, and anyone looking to improve their vocal skills through self-guided training.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                onClick={handleGetStarted}
                variant="primary"
                className="px-8 py-4 text-lg font-extrabold transition-all duration-300 transform hover:scale-105"
              >
                Start Training Free
              </Button>
              <Button
                onClick={handleLogin}
                variant="secondary"
                className="px-8 py-4 text-lg font-extrabold transition-all duration-300 transform hover:scale-105"
              >
                Sign In
              </Button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] px-8 py-4 text-lg font-medium transition-colors"
              >
                <PlayCircle className="w-6 h-6" />
                See How It Works
              </button>
            </div>

            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--primary-rgb),0.2)] to-transparent rounded-2xl"></div>
              <div className="bg-[var(--panel)] backdrop-blur-sm rounded-2xl p-8 border border-[var(--border)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  <div>
                    <div className="text-3xl md:text-4xl font-extrabold text-[var(--text)] mb-2">3+</div>
                    <div className="text-[var(--muted)] text-sm">Exercise Categories</div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-extrabold text-[var(--text)] mb-2">Free</div>
                    <div className="text-[var(--muted)] text-sm">To Use</div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-extrabold text-[var(--text)] mb-2">Web</div>
                    <div className="text-[var(--muted)] text-sm">Based Tool</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[var(--panel)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text)] mb-6">
              Powerful Features for Voice Excellence
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto">
              A simple voice training tool with organized exercises and recording capabilities
              to help you practice and improve your vocal skills.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="text-[var(--primary)] mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-extrabold text-[var(--text)] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20 bg-gradient-to-r from-[rgba(var(--primary-rgb),0.05)] to-[rgba(var(--primary-rgb),0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text)] mb-6">
              Perfect for Every Voice Goal
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto">
              Whether you're a complete beginner or a seasoned professional, our tailored approach
              helps you achieve your specific vocal objectives.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {userTypes.map((type, index) => (
              <div key={index} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{type.icon}</div>
                  <h3 className="text-xl font-extrabold text-[var(--text)]">
                    {type.title}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {type.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[var(--success)] mt-0.5 flex-shrink-0" />
                      <span className="text-[var(--muted)] text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text)] mb-6">
              How It Works
            </h2>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto">
              Get started with voice training in just three simple steps. Our intuitive platform
              makes professional-quality voice coaching accessible to everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {howItWorks.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-8">
                  <div className="mx-auto w-24 h-24 bg-[rgba(var(--primary-rgb),0.1)] rounded-full flex items-center justify-center mb-4">
                    <div className="text-[var(--primary)]">{step.icon.props.children}</div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-white rounded-full flex items-center justify-center text-sm font-extrabold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-[var(--text)] mb-4">
                  {step.title}
                </h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Educational Content Section */}
      <section className="py-20 bg-gradient-to-r from-[rgba(var(--primary-rgb),0.05)] to-[rgba(var(--primary-rgb),0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text)] mb-6">
                Why Voice Training Matters
              </h2>
              <p className="text-lg text-[var(--muted)] mb-8 leading-relaxed">
                Your voice is your most powerful tool for communication, expression, and connection.
                Whether you're presenting ideas, performing on stage, or having everyday conversations,
                regular practice with structured exercises can help improve your confidence and vocal skills.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[var(--text)] mb-2">Enhanced Communication</h4>
                    <p className="text-[var(--muted)]">Clear, confident speech improves personal and professional relationships.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[var(--text)] mb-2">Career Advancement</h4>
                    <p className="text-[var(--muted)]">Strong vocal skills are essential for leadership and professional success.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[var(--text)] mb-2">Consistent Practice</h4>
                    <p className="text-[var(--muted)]">Regular practice with structured exercises helps build vocal skills over time.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-8 shadow-xl">
              <h3 className="text-2xl font-extrabold text-[var(--text)] mb-6">
                Simple Tools for Voice Practice
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Browser-based Recording</span>
                  <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Organized Exercise Sets</span>
                  <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Auto-Split Long Recordings</span>
                  <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
                  <span className="text-[var(--muted)]">Cross-platform Compatibility</span>
                  <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[var(--muted)]">Session Logging</span>
                  <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-[var(--panel)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text)] mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-[var(--muted)]">
              Everything you need to know about getting started with voice training
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-[var(--panel)] transition-colors"
                >
                  <span className="font-extrabold text-[var(--text)]">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-[var(--primary)]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--primary)]" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-[var(--muted)] leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[rgba(var(--primary-rgb),0.15)] via-transparent to-[rgba(var(--primary-rgb),0.1)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text)] mb-6">
            Ready to Transform Your Voice?
          </h2>
          <p className="text-xl text-[var(--muted)] mb-8 max-w-2xl mx-auto">
            Start practicing with organized voice exercises and recording tools.
            Begin your vocal improvement journey today with simple, effective practice.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleGetStarted}
              variant="primary"
              className="px-8 py-4 text-lg font-extrabold transition-all duration-300 transform hover:scale-105"
            >
              Start Training Free
            </Button>
            <button
              onClick={handleLogin}
              className="text-[var(--muted)] hover:text-[var(--text)] px-8 py-4 text-lg font-medium transition-colors border border-[var(--border)] rounded-xl hover:border-[var(--primary)]"
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--panel-2)] border-t border-[var(--border)] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-extrabold text-[var(--text)] mb-4">🎵 Golosina</h3>
              <p className="text-[var(--muted)] mb-6 max-w-md">
                Voice training tool with organized exercises and recording capabilities
                helping singers, speakers, and performers practice and improve their vocal skills.
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-[var(--text)] mb-4">About</h4>
              <p className="text-[var(--muted)] text-sm">
                Golosina is a simple voice training tool for practice and improvement.
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-[var(--text)] mb-4">Get Started</h4>
              <p className="text-[var(--muted)] text-sm">
                Click "Start Training Free" above to begin practicing with voice exercises.
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border)] mt-12 pt-8 text-center">
            <p className="text-[var(--muted)]">
              © {new Date().getFullYear()} Golosina. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
        errorMessage={errorMessage}
      />
      </div>
    </>
  )
}

export const MarketingLandingPage = React.memo(MarketingLandingPageComponent)
MarketingLandingPage.displayName = 'MarketingLandingPage'