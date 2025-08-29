'use client'

import React, { useState } from 'react';
import { 
  BookOpen, 
  Database, 
  Users, 
  BarChart3, 
  Settings,
  FileText,
  MessageSquare,
  Calendar
} from 'lucide-react';
import MediaManagementAdmin from './MediaManagementAdmin';

type AdminTab = 'overview' | 'exercises' | 'media' | 'students' | 'analytics' | 'settings';

interface LessonAdministrationProps {
  className?: string;
}

export default function LessonAdministration({ className = '' }: LessonAdministrationProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const tabs = [
    {
      id: 'overview' as AdminTab,
      label: 'Overview',
      icon: BarChart3,
      description: 'Dashboard and system overview'
    },
    {
      id: 'exercises' as AdminTab,
      label: 'Exercises',
      icon: BookOpen,
      description: 'Manage exercise sets and content'
    },
    {
      id: 'media' as AdminTab,
      label: 'Media',
      icon: Database,
      description: 'Upload and manage media files'
    },
    {
      id: 'students' as AdminTab,
      label: 'Students',
      icon: Users,
      description: 'Student progress and management'
    },
    {
      id: 'analytics' as AdminTab,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Usage statistics and reports'
    },
    {
      id: 'settings' as AdminTab,
      label: 'Settings',
      icon: Settings,
      description: 'System configuration'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Lesson Administration Dashboard</h2>
        <p className="text-gray-600 mb-6">
          Manage all aspects of your voice training application from this central dashboard.
        </p>
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Active Exercises</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Media Files</p>
                <p className="text-2xl font-bold">48</p>
              </div>
              <Database className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Active Students</p>
                <p className="text-2xl font-bold">156</p>
              </div>
              <Users className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Sessions Today</p>
                <p className="text-2xl font-bold">23</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('exercises')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <BookOpen className="w-6 h-6 text-blue-500" />
            <div>
              <p className="font-medium text-gray-900">Manage Exercises</p>
              <p className="text-sm text-gray-500">Create and edit exercise content</p>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('media')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Database className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium text-gray-900">Upload Media</p>
              <p className="text-sm text-gray-500">Add images and videos</p>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <BarChart3 className="w-6 h-6 text-purple-500" />
            <div>
              <p className="font-medium text-gray-900">View Analytics</p>
              <p className="text-sm text-gray-500">Track usage and progress</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderExercises = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Exercise Management</h2>
        <p className="text-gray-600 mb-6">
          Create, edit, and organize vocal training exercises and lesson plans.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-500" />
            <div>
              <p className="font-medium text-blue-900">Exercise Management</p>
              <p className="text-sm text-blue-700">This section will be implemented in a future update.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Student Management</h2>
        <p className="text-gray-600 mb-6">
          Monitor student progress, manage accounts, and track learning outcomes.
        </p>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium text-green-900">Student Management</p>
              <p className="text-sm text-green-700">This section will be implemented in a future update.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics & Reports</h2>
        <p className="text-gray-600 mb-6">
          View detailed analytics about application usage, student progress, and system performance.
        </p>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-purple-500" />
            <div>
              <p className="font-medium text-purple-900">Analytics Dashboard</p>
              <p className="text-sm text-purple-700">This section will be implemented in a future update.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h2>
        <p className="text-gray-600 mb-6">
          Configure global application settings, permissions, and system parameters.
        </p>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900">System Configuration</p>
              <p className="text-sm text-gray-700">This section will be implemented in a future update.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'exercises':
        return renderExercises();
      case 'media':
        return <MediaManagementAdmin className="space-y-6" />;
      case 'students':
        return renderStudents();
      case 'analytics':
        return renderAnalytics();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Lesson Administration</h1>
          <p className="text-gray-500 mt-1">Manage your voice training application</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                title={tab.description}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderContent()}
      </div>
    </div>
  );
}