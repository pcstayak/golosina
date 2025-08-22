'use client'

import { useMemo } from 'react';

interface AudioLevelMeterProps {
  level: number; // 0-1 normalized audio level
  isSilent?: boolean;
  silenceDuration?: number;
  className?: string;
  showSilenceIndicator?: boolean;
  autoSplitThreshold?: number;
  autoSplitDuration?: number;
}

export default function AudioLevelMeter({
  level,
  isSilent = false,
  silenceDuration = 0,
  className = '',
  showSilenceIndicator = true,
  autoSplitThreshold = 0.02,
  autoSplitDuration = 1.0
}: AudioLevelMeterProps) {
  // Convert level to percentage for display
  const levelPercentage = Math.min(Math.max(level * 100, 0), 100);
  
  // Calculate threshold line position
  const thresholdPercentage = Math.min(Math.max(autoSplitThreshold * 100, 0), 100);
  
  // Determine meter color based on level and silence state
  const getMeterColor = useMemo(() => {
    if (isSilent) {
      const silenceProgress = Math.min(silenceDuration / autoSplitDuration, 1);
      if (silenceProgress > 0.8) {
        return 'bg-red-500'; // About to split
      } else if (silenceProgress > 0.5) {
        return 'bg-yellow-500'; // Approaching split
      } else {
        return 'bg-gray-400'; // Silent
      }
    } else {
      if (levelPercentage > 70) {
        return 'bg-green-500'; // Strong signal
      } else if (levelPercentage > 30) {
        return 'bg-blue-500'; // Good signal
      } else {
        return 'bg-green-300'; // Weak signal
      }
    }
  }, [isSilent, silenceDuration, autoSplitDuration, levelPercentage]);

  // Silence progress for visual countdown
  const silenceProgress = Math.min(silenceDuration / autoSplitDuration, 1);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Audio Level Meter */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Audio Level</span>
          <span>{levelPercentage.toFixed(0)}%</span>
        </div>
        
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          {/* Threshold indicator line */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-300 z-10"
            style={{ left: `${thresholdPercentage}%` }}
            title={`Silence threshold: ${(autoSplitThreshold * 100).toFixed(1)}%`}
          />
          
          {/* Audio level bar */}
          <div 
            className={`h-full transition-all duration-100 ${getMeterColor}`}
            style={{ width: `${levelPercentage}%` }}
          />
        </div>
      </div>

      {/* Silence Indicator */}
      {showSilenceIndicator && isSilent && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              Silence Detected
            </span>
            <span>{silenceDuration.toFixed(1)}s / {autoSplitDuration.toFixed(1)}s</span>
          </div>
          
          {/* Silence progress bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-100 ${
                silenceProgress > 0.8 ? 'bg-red-500' : 
                silenceProgress > 0.5 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${silenceProgress * 100}%` }}
            />
          </div>
          
          {silenceProgress > 0.8 && (
            <div className="text-xs text-red-600 font-medium animate-pulse">
              Auto-split imminent!
            </div>
          )}
        </div>
      )}

      {/* Status indicators */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isSilent ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
          <span className="text-gray-600">
            {isSilent ? 'Silent' : 'Recording'}
          </span>
        </div>
        
        {showSilenceIndicator && (
          <div className="text-gray-500">
            Split at {autoSplitDuration}s silence
          </div>
        )}
      </div>
    </div>
  );
}