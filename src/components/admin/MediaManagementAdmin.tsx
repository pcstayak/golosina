'use client'

import React, { useState, useCallback } from 'react';
import { Upload, Settings, Database, FileText, BarChart3, Trash2, RefreshCw } from 'lucide-react';
import MediaLibrary from '../media/MediaLibrary';
import MediaUploader from '../media/MediaUploader';

interface AdminStats {
  totalFiles: number;
  totalSize: number;
  filesByType: {
    images: number;
    videos: number;
    gifs: number;
  };
  storageUsage: number; // percentage
}

interface MediaManagementAdminProps {
  className?: string;
}

export default function MediaManagementAdmin({ className = '' }: MediaManagementAdminProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'library' | 'upload' | 'settings'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalFiles: 0,
    totalSize: 0,
    filesByType: { images: 0, videos: 0, gifs: 0 },
    storageUsage: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/media/list?limit=1000');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load statistics');
      }

      const files = result.files;
      const totalSize = files.reduce((sum: number, file: any) => sum + file.size, 0);
      const filesByType = files.reduce((acc: any, file: any) => {
        if (file.type === 'image') acc.images++;
        else if (file.type === 'video') acc.videos++;
        else if (file.type === 'gif') acc.gifs++;
        return acc;
      }, { images: 0, videos: 0, gifs: 0 });

      // Calculate storage usage (assuming 1GB limit for demo)
      const storageLimit = 1024 * 1024 * 1024; // 1GB
      const storageUsage = (totalSize / storageLimit) * 100;

      setStats({
        totalFiles: files.length,
        totalSize,
        filesByType,
        storageUsage: Math.min(storageUsage, 100),
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      showNotification('error', 'Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  }, [showNotification]);

  React.useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
    }
  }, [activeTab, loadStats]);

  const handleUploadComplete = (files: any[]) => {
    showNotification('success', `Successfully uploaded ${files.length} file(s)`);
    loadStats(); // Refresh stats
  };

  const handleUploadError = (error: string) => {
    showNotification('error', error);
  };

  const handleFileDelete = () => {
    showNotification('success', 'File deleted successfully');
    loadStats(); // Refresh stats
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(stats.totalSize)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-3">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.storageUsage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.storageUsage.toFixed(1)}% of 1GB used</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Images</p>
              <p className="text-2xl font-bold text-gray-900">{stats.filesByType.images}</p>
            </div>
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF files</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Videos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.filesByType.videos}</p>
            </div>
            <Upload className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">MP4, WebM files</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-6 h-6 text-blue-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Upload Media</p>
              <p className="text-sm text-gray-500">Add new images or videos</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Database className="w-6 h-6 text-green-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Browse Library</p>
              <p className="text-sm text-gray-500">View and manage files</p>
            </div>
          </button>

          <button
            onClick={loadStats}
            disabled={isLoadingStats}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-6 h-6 text-purple-500 ${isLoadingStats ? 'animate-spin' : ''}`} />
            <div className="text-left">
              <p className="font-medium text-gray-900">Refresh Stats</p>
              <p className="text-sm text-gray-500">Update statistics</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Max File Size:</span>
            <span className="font-medium">50 MB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Supported Formats:</span>
            <span className="font-medium">JPG, PNG, GIF, MP4, WebM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Storage Location:</span>
            <span className="font-medium">/public/uploads/</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Auto-thumbnail:</span>
            <span className="font-medium text-green-600">Enabled for videos</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum File Size (MB)
            </label>
            <input
              type="number"
              defaultValue="50"
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum size for uploaded files</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Location
            </label>
            <input
              type="text"
              defaultValue="/public/uploads/"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Files are stored in the public uploads directory</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">File Type Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">JPEG Images</p>
              <p className="text-sm text-gray-500">Allow JPG and JPEG files</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">PNG Images</p>
              <p className="text-sm text-gray-500">Allow PNG files</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">GIF Images</p>
              <p className="text-sm text-gray-500">Allow animated GIF files</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">MP4 Videos</p>
              <p className="text-sm text-gray-500">Allow MP4 video files</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">WebM Videos</p>
              <p className="text-sm text-gray-500">Allow WebM video files</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Thumbnail Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Auto-generate Thumbnails</p>
              <p className="text-sm text-gray-500">Automatically create thumbnails for uploaded videos</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thumbnail Quality
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="low">Low (Faster processing)</option>
              <option value="medium" selected>Medium (Balanced)</option>
              <option value="high">High (Better quality)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Media Management</h1>
            <p className="text-gray-500">Manage your media files and settings</p>
          </div>
          
          {/* Notification */}
          {notification && (
            <div className={`
              px-4 py-2 rounded-lg text-sm font-medium
              ${notification.type === 'success' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
              }
            `}>
              {notification.message}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'library', label: 'Media Library', icon: Database },
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && renderOverview()}
        
        {activeTab === 'library' && (
          <MediaLibrary
            onFileDelete={handleFileDelete}
            className="bg-white border border-gray-200 rounded-lg p-6"
          />
        )}
        
        {activeTab === 'upload' && (
          <div className="max-w-4xl mx-auto">
            <MediaUploader
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              className="bg-white border border-gray-200 rounded-lg p-6"
            />
          </div>
        )}
        
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  );
}