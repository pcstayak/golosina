'use client'

import { useApp } from '@/contexts/AppContext';
import { BookOpen, Clock, Lightbulb, Image, Plus, Edit3 } from 'lucide-react';
import MediaGallery from './MediaGallery';
import MediaPicker from '../media/MediaPicker';
import { MediaContent } from '@/contexts/AppContext';

export default function ExerciseDisplay() {
  const { state, dispatch, getCurrentExercise, getCurrentSet } = useApp();
  
  const currentExercise = getCurrentExercise();
  const currentSet = getCurrentSet();
  const isMediaPickerOpen = state.mediaManagement.isMediaPickerOpen;
  const selectedExerciseId = state.mediaManagement.selectedExerciseForMedia;

  const handleOpenMediaPicker = () => {
    if (currentExercise) {
      dispatch({ 
        type: 'OPEN_MEDIA_PICKER', 
        payload: { exerciseId: currentExercise.id } 
      });
    }
  };

  const handleCloseMediaPicker = () => {
    dispatch({ type: 'CLOSE_MEDIA_PICKER' });
  };

  const handleMediaSelect = (mediaItems: MediaContent[]) => {
    if (currentExercise && currentSet) {
      dispatch({
        type: 'ADD_MEDIA_TO_EXERCISE',
        payload: {
          exerciseId: currentExercise.id,
          setId: currentSet.id,
          media: mediaItems,
        },
      });
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    if (currentExercise && currentSet) {
      dispatch({
        type: 'REMOVE_MEDIA_FROM_EXERCISE',
        payload: {
          exerciseId: currentExercise.id,
          setId: currentSet.id,
          mediaId,
        },
      });
    }
  };

  if (!currentExercise) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <p>No exercise selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-primary" />
        {currentExercise.name}
      </h3>
      
      <div className="space-y-6">
        {/* Media content section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <Image className="w-4 h-4" aria-label="Visual guide icon" />
              Visual Guide
            </h4>
            
            {/* Media Management Controls - Only show in admin/edit mode */}
            {process.env.NODE_ENV === 'development' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleOpenMediaPicker}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  title="Add media to exercise"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Media</span>
                </button>
                
                {currentExercise.media && currentExercise.media.length > 0 && (
                  <button
                    onClick={handleOpenMediaPicker}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Edit media"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            )}
          </div>
          
          {currentExercise.media && currentExercise.media.length > 0 ? (
            <MediaGallery 
              mediaItems={currentExercise.media}
              onRemoveMedia={process.env.NODE_ENV === 'development' ? handleRemoveMedia : undefined}
            />
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" aria-label="No media available" />
              <p className="text-gray-500 text-sm">No visual guide available</p>
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={handleOpenMediaPicker}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Add media to this exercise
                </button>
              )}
            </div>
          )}
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Instructions</h4>
          <p className="text-gray-600 leading-relaxed">
            {currentExercise.instructions}
          </p>
        </div>
        
        {currentExercise.duration && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{currentExercise.duration}</span>
          </div>
        )}
        
        {currentExercise.tips && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-blue-800 mb-1">Tip</h5>
                <p className="text-blue-700 text-sm">
                  {currentExercise.tips}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media Picker Modal */}
      {isMediaPickerOpen && selectedExerciseId === currentExercise?.id && (
        <MediaPicker
          isOpen={isMediaPickerOpen}
          onClose={handleCloseMediaPicker}
          onSelect={handleMediaSelect}
          selectedMedia={currentExercise?.media || []}
          maxSelection={5}
          title="Add Media to Exercise"
          description={`Choose media files to add to "${currentExercise?.name}"`}
        />
      )}
    </div>
  );
}