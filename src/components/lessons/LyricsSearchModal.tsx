'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { X, Search, Loader2 } from 'lucide-react';
import { LyricsService, LyricsSearchResult } from '@/services/lyricsService';

interface LyricsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lyrics: string) => void;
}

export default function LyricsSearchModal({ isOpen, onClose, onSelect }: LyricsSearchModalProps) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [results, setResults] = useState<LyricsSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!title.trim()) {
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSelectedIndex(null);

    try {
      // Search internal database first
      const internalResults = await LyricsService.searchInternal(title, artist);

      // TODO: Add Genius API search when implemented server-side
      // const geniusResult = await LyricsService.searchGenius(title, artist);
      // if (geniusResult) {
      //   results.push(geniusResult);
      // }

      setResults(internalResults);
    } catch (error) {
      console.error('Error searching lyrics:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseSelected = () => {
    if (selectedIndex !== null && results[selectedIndex]) {
      onSelect(results[selectedIndex].lyrics);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Search Lyrics</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Form */}
        <div className="p-4 space-y-3 border-b">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Song Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter song title..."
              className="w-full px-3 py-2 border rounded-md"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Artist (optional)
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Enter artist name..."
              className="w-full px-3 py-2 border rounded-md"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>

          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={!title.trim() || isSearching}
            className="flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 250px)' }}>
          {results.length === 0 && !isSearching && (
            <p className="text-sm text-gray-500 text-center py-8">
              Enter a song title and click search to find lyrics
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Found {results.length} result{results.length !== 1 ? 's' : ''}:
              </p>
              {results.map((result, index) => (
                <label
                  key={index}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedIndex === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="lyrics-result"
                    checked={selectedIndex === index}
                    onChange={() => setSelectedIndex(index)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800">
                      &quot;{result.title}&quot; - {result.artist}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {result.source === 'internal' ? (
                        <>From teacher: {result.uploadedBy}</>
                      ) : (
                        <>From {result.source}</>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-2 line-clamp-3">
                      {result.lyrics.substring(0, 150)}...
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUseSelected}
            disabled={selectedIndex === null}
          >
            Use Selected
          </Button>
        </div>
      </div>
    </div>
  );
}
