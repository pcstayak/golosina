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
      const allResults: LyricsSearchResult[] = [];

      // Search external API first (if artist is provided)
      if (artist.trim()) {
        const externalResult = await LyricsService.searchExternal(title, artist);
        if (externalResult) {
          allResults.push(externalResult);
        }
      }

      // Search internal database
      const internalResults = await LyricsService.searchInternal(title, artist);
      allResults.push(...internalResults);

      setResults(allResults);

      // If no results found, show a message
      if (allResults.length === 0) {
        console.log('No lyrics found');
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.80)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-[14px] shadow-[var(--shadow)] max-w-2xl w-full max-h-[80vh] overflow-hidden border border-[var(--border)]" style={{ background: 'rgba(11, 18, 32, 0.95)', backdropFilter: 'blur(20px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-extrabold text-[var(--text)]">Search Lyrics</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Form */}
        <div className="p-4 space-y-3 border-b border-[var(--border)]">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)] mb-1">
              Song Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter song title..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[10px] bg-[var(--panel)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)] mb-1">
              Artist (optional)
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Enter artist name..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[10px] bg-[var(--panel)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
            <p className="text-sm text-[var(--muted)] text-center py-8">
              Enter a song title and click search to find lyrics
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-extrabold text-[var(--text)] mb-3">
                Found {results.length} result{results.length !== 1 ? 's' : ''}:
              </p>
              {results.map((result, index) => (
                <label
                  key={index}
                  className={`flex items-start gap-3 p-3 border rounded-[10px] cursor-pointer transition-colors ${
                    selectedIndex === index
                      ? 'border-[var(--primary)] bg-[rgba(var(--primary-rgb),0.1)]'
                      : 'border-[var(--border)] hover:border-[var(--primary)] bg-[var(--panel)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="lyrics-result"
                    checked={selectedIndex === index}
                    onChange={() => setSelectedIndex(index)}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[var(--text)]">
                      &quot;{result.title}&quot; - {result.artist}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {result.source === 'internal' ? (
                        <>From teacher: {result.uploadedBy}</>
                      ) : (
                        <>From {result.source === 'lyrics.ovh' ? 'Lyrics.ovh' : result.source}</>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-2 line-clamp-3">
                      {result.lyrics.substring(0, 150)}...
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--border)]">
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
