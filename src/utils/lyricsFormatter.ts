/**
 * Formats and cleans up lyrics text
 */
export function formatLyrics(lyrics: string): string {
  if (!lyrics || !lyrics.trim()) {
    return '';
  }

  let formatted = lyrics;

  // Step 1: Normalize line endings
  formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 2: Remove common unwanted patterns
  // Remove "Lyrics" or "lyrics" at the beginning
  formatted = formatted.replace(/^[\s\n]*lyrics[\s\n]*/i, '');

  // Remove common metadata patterns
  formatted = formatted.replace(/^\d+\s+Contributors?.*$/gim, '');
  formatted = formatted.replace(/^Embed$/gim, '');
  formatted = formatted.replace(/^Share$/gim, '');

  // Step 3: Clean up each line
  const lines = formatted.split('\n');
  const cleanedLines = lines.map(line => {
    // Trim whitespace
    let cleaned = line.trim();

    // Remove excessive punctuation (more than 3 repeated chars)
    cleaned = cleaned.replace(/(.)\1{3,}/g, '$1$1$1');

    return cleaned;
  });

  // Step 4: Remove excessive empty lines (max 1 consecutive)
  const dedupedLines: string[] = [];
  let lastWasEmpty = false;

  for (const line of cleanedLines) {
    if (line === '') {
      if (!lastWasEmpty) {
        dedupedLines.push(line);
      }
      lastWasEmpty = true;
    } else {
      dedupedLines.push(line);
      lastWasEmpty = false;
    }
  }

  // Step 5: Detect and format sections (chorus, verse, bridge, etc.)
  const formattedLines: string[] = [];
  const sectionPattern = /^\[(.*?)\]$/i; // Matches [Chorus], [Verse 1], etc.

  for (let i = 0; i < dedupedLines.length; i++) {
    const line = dedupedLines[i];
    const match = line.match(sectionPattern);

    if (match) {
      // This is a section marker
      const sectionName = match[1].trim();

      // Ensure blank line before section (unless it's the first line)
      if (i > 0 && dedupedLines[i - 1] !== '') {
        formattedLines.push('');
      }

      // Add the section marker in uppercase
      formattedLines.push(`[${sectionName.toUpperCase()}]`);

      // No blank line immediately after section marker
      continue;
    }

    formattedLines.push(line);
  }

  // Step 6: Trim leading/trailing empty lines
  while (formattedLines.length > 0 && formattedLines[0] === '') {
    formattedLines.shift();
  }
  while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === '') {
    formattedLines.pop();
  }

  return formattedLines.join('\n');
}

/**
 * Detects if lyrics have section markers
 */
export function hasLyricsSections(lyrics: string): boolean {
  const sectionPattern = /^\[(.*?)\]$/im;
  return sectionPattern.test(lyrics);
}

/**
 * Auto-detects and adds section markers if not present
 * (basic heuristic - looks for repeated sections)
 */
export function autoDetectSections(lyrics: string): string {
  // This is a simple implementation
  // A more sophisticated version could use pattern matching
  // to detect repeated chorus sections

  // For now, just return formatted lyrics
  // Advanced section detection can be added later
  return formatLyrics(lyrics);
}
