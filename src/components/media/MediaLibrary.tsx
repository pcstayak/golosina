'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Grid, List, Trash2, Eye, Download, Play, FileImage, Video as VideoIcon } from 'lucide-react';
import Image from 'next/image';

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'gif';
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

interface MediaLibraryProps {
  onFileSelect?: (file: MediaFile) => void;
  onFileDelete?: (file: MediaFile) => void;
  selectionMode?: boolean;
  selectedFiles?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'image' | 'video' | 'gif';
type SortBy = 'date' | 'name' | 'size' | 'type';

export default function MediaLibrary({
  onFileSelect,
  onFileDelete,
  selectionMode = false,
  selectedFiles = [],
  onSelectionChange,
  className = ''
}: MediaLibraryProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadFiles = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentPage = reset ? 0 : page;
      const params = new URLSearchParams({
        limit: '20',
        offset: (currentPage * 20).toString(),
      });

      if (filterType !== 'all') {
        params.append('type', filterType);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/media/list?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load media files');
      }

      const sortedFiles = [...result.files].sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'size':
            return b.size - a.size;
          case 'type':
            return a.type.localeCompare(b.type);
          case 'date':
          default:
            return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        }
      });

      if (reset) {
        setFiles(sortedFiles);
        setPage(1);
      } else {
        setFiles(prev => [...prev, ...sortedFiles]);
        setPage(prev => prev + 1);
      }

      setHasMore(result.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [filterType, searchTerm, sortBy, page]);

  // Load initial files and reload when filters change
  useEffect(() => {
    loadFiles(true);
  }, [filterType, searchTerm, sortBy, loadFiles]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleFilterChange = (filter: FilterType) => {
    setFilterType(filter);
    setPage(0);
  };

  const handleSortChange = (sort: SortBy) => {
    setSortBy(sort);
    setPage(0);
  };

  const handleFileClick = (file: MediaFile) => {
    if (selectionMode && onSelectionChange) {
      const isSelected = selectedFiles.includes(file.id);
      const newSelection = isSelected 
        ? selectedFiles.filter(id => id !== file.id)
        : [...selectedFiles, file.id];
      onSelectionChange(newSelection);
    } else if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleDeleteFile = async (file: MediaFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/media/delete?file=${encodeURIComponent(file.url)}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete file');
      }

      // Remove file from local state
      setFiles(prev => prev.filter(f => f.id !== file.id));
      
      // Update selection if needed
      if (selectionMode && selectedFiles.includes(file.id) && onSelectionChange) {
        onSelectionChange(selectedFiles.filter(id => id !== file.id));
      }

      if (onFileDelete) {
        onFileDelete(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const getFileIcon = (file: MediaFile) => {
    switch (file.type) {
      case 'video':
        return <VideoIcon className="w-4 h-4" />;
      case 'gif':
        return <FileImage className="w-4 h-4 text-orange-500" />;
      case 'image':
      default:
        return <FileImage className="w-4 h-4 text-blue-500" />;
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          className={`
            group relative bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer
            hover:shadow-md transition-all duration-200
            ${selectionMode && selectedFiles.includes(file.id) 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:border-gray-300'
            }
          `}
          onClick={() => handleFileClick(file)}
        >
          {/* Media Preview */}
          <div className="aspect-square relative bg-gray-100">
            {file.type === 'video' ? (
              <div className="relative w-full h-full">
                {file.thumbnailUrl ? (
                  <Image
                    src={file.thumbnailUrl}
                    alt={file.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
              </div>
            ) : (
              <Image
                src={file.url}
                alt={file.name}
                fill
                className="object-cover"
              />
            )}

            {/* Selection checkbox */}
            {selectionMode && (
              <div className="absolute top-2 left-2">
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center
                  ${selectedFiles.includes(file.id) 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'bg-white border-gray-300'
                  }
                `}>
                  {selectedFiles.includes(file.id) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(file.url, '_blank');
                  }}
                  className="p-1 bg-black bg-opacity-70 text-white rounded hover:bg-opacity-90 transition-colors"
                  title="View full size"
                >
                  <Eye className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file);
                  }}
                  className="p-1 bg-black bg-opacity-70 text-white rounded hover:bg-red-600 transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* File Info */}
          <div className="p-3">
            <div className="flex items-center space-x-2 mb-1">
              {getFileIcon(file)}
              <span className="text-xs font-medium text-gray-700 uppercase">
                {file.type}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(file.size)}
            </p>
            <p className="text-xs text-gray-400">
              {formatDate(file.uploadedAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="divide-y divide-gray-200">
        {files.map((file) => (
          <div
            key={file.id}
            className={`
              flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors
              ${selectionMode && selectedFiles.includes(file.id) ? 'bg-blue-50' : ''}
            `}
            onClick={() => handleFileClick(file)}
          >
            {/* Selection checkbox */}
            {selectionMode && (
              <div className="mr-3">
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center
                  ${selectedFiles.includes(file.id) 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'bg-white border-gray-300'
                  }
                `}>
                  {selectedFiles.includes(file.id) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            )}

            {/* Thumbnail */}
            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden mr-3 flex-shrink-0">
              {file.type === 'video' ? (
                file.thumbnailUrl ? (
                  <Image
                    src={file.thumbnailUrl}
                    alt={file.name}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoIcon className="w-5 h-5 text-gray-400" />
                  </div>
                )
              ) : (
                <Image
                  src={file.url}
                  alt={file.name}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {getFileIcon(file)}
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="uppercase font-medium">{file.type}</span>
                <span>{formatFileSize(file.size)}</span>
                <span>{formatDate(file.uploadedAt)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-1 ml-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(file.url, '_blank');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="View full size"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFile(file);
                }}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search media files..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value as FilterType)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="gif">GIFs</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="type">Type</option>
          </select>

          {/* View Mode */}
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Files Display */}
      {loading && files.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading media files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12">
          <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No media files found</p>
          <p className="text-gray-400 text-sm">Upload some files to get started</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
          
          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-6">
              <button
                onClick={() => loadFiles(false)}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}