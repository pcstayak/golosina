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

  // Step 4: Remove parenthetical repetitions on their own lines
  const filteredLines = cleanedLines.filter(line => {
    // Remove lines that are only parenthetical content
    const parentheticalOnly = /^\(.*\)$/;
    return !parentheticalOnly.test(line);
  });

  // Step 5: Group lines into stanzas intelligently
  // Only treat multiple consecutive empty lines OR section markers as stanza breaks
  const sectionPattern = /^\[(.*?)\]$/i; // Matches [Chorus], [Verse 1], etc.
  const stanzas: string[][] = [];
  let currentStanza: string[] = [];
  let consecutiveEmptyCount = 0;

  for (const line of filteredLines) {
    if (line === '') {
      consecutiveEmptyCount++;
      // Only break stanza on 2+ consecutive empty lines
      if (consecutiveEmptyCount >= 2 && currentStanza.length > 0) {
        stanzas.push(currentStanza);
        currentStanza = [];
      }
    } else {
      consecutiveEmptyCount = 0;

      // Check if this is a section marker - always starts new stanza
      if (sectionPattern.test(line) && currentStanza.length > 0) {
        stanzas.push(currentStanza);
        currentStanza = [];
      }

      currentStanza.push(line);
    }
  }

  // Add the last stanza if it has content
  if (currentStanza.length > 0) {
    stanzas.push(currentStanza);
  }

  // Step 6: Format stanzas with section markers
  const formattedLines: string[] = [];

  for (let i = 0; i < stanzas.length; i++) {
    const stanza = stanzas[i];

    // Check if first line is a section marker
    const firstLine = stanza[0];
    const match = firstLine.match(sectionPattern);

    if (match) {
      // Ensure blank line before section (unless it's the first stanza)
      if (i > 0) {
        formattedLines.push('');
      }

      // Add the section marker in uppercase
      const sectionName = match[1].trim();
      formattedLines.push(`[${sectionName.toUpperCase()}]`);

      // Add the rest of the stanza (excluding the section marker)
      for (let j = 1; j < stanza.length; j++) {
        formattedLines.push(stanza[j]);
      }
    } else {
      // Regular stanza - add blank line before if not first
      if (i > 0) {
        formattedLines.push('');
      }

      // Add all lines in the stanza
      for (const line of stanza) {
        formattedLines.push(line);
      }
    }
  }

  // Step 7: Trim leading/trailing empty lines
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
