'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'

export default function TeacherDashboard() {
  const { profile, user, signOut } = useAuth()
  const { dispatch } = useApp()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleLaunchVoiceTrainer = () => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'landing' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {profile?.display_name || profile?.first_name || user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">My Students</h3>
              <p className="text-purple-600">Manage your student roster and track progress</p>
              <button className="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                View Students
              </button>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Lesson Plans</h3>
              <p className="text-blue-600">Create and manage voice training lesson plans</p>
              <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Create Lessons
              </button>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Progress Reports</h3>
              <p className="text-green-600">View detailed student progress and analytics</p>
              <button className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                View Reports
              </button>
            </div>

            <div className="bg-yellow-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Voice Trainer Access</h3>
              <p className="text-yellow-600">Access the main voice training application</p>
              <button 
                onClick={handleLaunchVoiceTrainer}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
              >
                Launch Trainer
              </button>
            </div>

            <div className="bg-indigo-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-indigo-800 mb-2">Shared Sessions</h3>
              <p className="text-indigo-600">Share training sessions with students</p>
              <button className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
                Manage Shares
              </button>
            </div>

            <div className="bg-pink-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-pink-800 mb-2">Profile Settings</h3>
              <p className="text-pink-600">Update your teaching profile and preferences</p>
              <button className="mt-3 px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors">
                Edit Profile
              </button>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Quick Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-gray-600">Active Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-600">Lesson Plans</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">Hours Taught</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">0</div>
                <div className="text-sm text-gray-600">Shared Sessions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}