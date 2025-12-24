'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'

export default function AdminDashboard() {
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
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
            <div className="bg-red-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">User Management</h3>
              <p className="text-red-600">Manage teachers, students, and user accounts</p>
              <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                Manage Users
              </button>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">System Analytics</h3>
              <p className="text-orange-600">View system usage and performance metrics</p>
              <button className="mt-3 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">
                View Analytics
              </button>
            </div>

            <div className="bg-teal-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-teal-800 mb-2">Content Management</h3>
              <p className="text-teal-600">Manage exercise sets and training content</p>
              <button className="mt-3 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors">
                Manage Content
              </button>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Teacher Verification</h3>
              <p className="text-purple-600">Review and verify teacher credentials</p>
              <button className="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                Review Credentials
              </button>
            </div>

            <div className="bg-indigo-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-indigo-800 mb-2">System Settings</h3>
              <p className="text-indigo-600">Configure application settings and features</p>
              <button className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
                System Settings
              </button>
            </div>

            <div className="bg-cyan-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-cyan-800 mb-2">Voice Trainer Access</h3>
              <p className="text-cyan-600">Access the main voice training application</p>
              <button 
                onClick={handleLaunchVoiceTrainer}
                className="mt-3 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
              >
                Launch Trainer
              </button>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">System Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">0</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-gray-600">Active Teachers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-600">0</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-gray-600">Pending Verifications</div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Admin Access:</strong> You have full administrative privileges. Use these tools responsibly to maintain the platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}