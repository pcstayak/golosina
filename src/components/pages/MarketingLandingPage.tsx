'use client'

import React, { useState } from 'react'
import Head from 'next/head'
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

export const MarketingLandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

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
      title: "Real-Time Audio Analysis",
      description: "Get instant AI-powered feedback on your vocal performance with advanced speech recognition technology."
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Personalized Exercise Sets",
      description: "Customized training programs for breathing, vocal warm-ups, and pitch accuracy based on your goals."
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Progress Tracking",
      description: "Monitor your improvement with detailed analytics, streak counters, and performance insights."
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
      title: "Professional Quality",
      description: "Industry-standard tools and techniques used by voice coaches and professional performers."
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
      title: "Practice with AI",
      description: "Record your voice and receive real-time feedback powered by advanced audio analysis technology.",
      icon: <Mic className="w-12 h-12 text-purple-600" />
    },
    {
      step: 3,
      title: "Track Progress",
      description: "Monitor your improvement with detailed analytics, streaks, and performance insights over time.",
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
      question: "How does the AI feedback work?",
      answer: "Our advanced audio analysis technology listens to your voice in real-time and provides instant feedback on pitch accuracy, breath control, timing, and vocal quality. It's like having a personal voice coach available 24/7."
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
        "description": "AI-powered voice training platform for singers, speakers, and performers",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Web Browser",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "1247",
          "bestRating": "5",
          "worstRating": "1"
        },
        "featureList": [
          "Real-time audio analysis with AI feedback",
          "Personalized exercise sets",
          "Progress tracking and analytics",
          "Cross-platform compatibility",
          "Auto-splitting recordings with silence detection"
        ]
      },
      {
        "@type": "Organization",
        "name": "Golosina",
        "url": "https://golosina.net",
        "logo": "https://golosina.net/logo.png",
        "sameAs": [
          "https://twitter.com/golosina",
          "https://facebook.com/golosina",
          "https://instagram.com/golosina"
        ],
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
        "description": "AI-powered voice training for singers, speakers, performers, and students",
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
      
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              Master Your Voice with{' '}
              <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                AI-Powered Training
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Get personalized voice coaching with real-time AI feedback. Perfect for singers, speakers, performers, and anyone looking to improve their vocal skills.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                onClick={handleGetStarted}
                className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Start Training Free
              </Button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 text-white/90 hover:text-white px-8 py-4 text-lg font-medium transition-colors"
              >
                <PlayCircle className="w-6 h-6" />
                See How It Works
              </button>
            </div>

            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-purple-600/50 to-transparent rounded-2xl"></div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">50K+</div>
                    <div className="text-white/80 text-sm">Active Users</div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">1M+</div>
                    <div className="text-white/80 text-sm">Voice Sessions</div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">95%</div>
                    <div className="text-white/80 text-sm">Success Rate</div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">24/7</div>
                    <div className="text-white/80 text-sm">AI Coaching</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Powerful Features for Voice Excellence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform combines cutting-edge AI technology with proven voice training methods
              to deliver results that traditional coaching can't match.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="text-purple-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Perfect for Every Voice Goal
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're a complete beginner or a seasoned professional, our tailored approach 
              helps you achieve your specific vocal objectives.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {userTypes.map((type, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{type.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {type.title}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {type.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started with voice training in just three simple steps. Our intuitive platform
              makes professional-quality voice coaching accessible to everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {howItWorks.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-8">
                  <div className="mx-auto w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Educational Content Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Why Voice Training Matters
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Your voice is your most powerful tool for communication, expression, and connection. 
                Whether you're presenting ideas, performing on stage, or having everyday conversations, 
                proper voice training can dramatically improve your confidence and effectiveness.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Enhanced Communication</h4>
                    <p className="text-gray-600">Clear, confident speech improves personal and professional relationships.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Career Advancement</h4>
                    <p className="text-gray-600">Strong vocal skills are essential for leadership and professional success.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Consistent Practice</h4>
                    <p className="text-gray-600">Regular training with AI feedback ensures steady improvement over time.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                The Technology Behind Your Success
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Real-time Audio Processing</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Advanced Speech Recognition</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Silence Detection Algorithm</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Cross-platform WebRTC</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Progressive Analytics</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about getting started with voice training
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-purple-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-purple-600" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Voice?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have already improved their vocal skills with our AI-powered training platform.
            Start your journey to vocal excellence today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleGetStarted}
              className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              Start Training Free
            </Button>
            <button
              onClick={handleLogin}
              className="text-white/90 hover:text-white px-8 py-4 text-lg font-medium transition-colors border border-white/30 rounded-xl hover:border-white/50"
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">🎵 Golosina</h3>
              <p className="text-gray-400 mb-6 max-w-md">
                AI-powered voice training platform helping singers, speakers, and performers 
                achieve their vocal goals through personalized coaching and real-time feedback.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
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
      />
      </div>
    </>
  )
}