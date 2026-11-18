// Service for fetching and parsing synchronized LRC lyrics from LRCLIB
const lyricsCache = new Map();

/**
 * Parses raw LRC string into structured array of timed lines
 * @param {string} lrcString 
 * @returns {Array<{ time: number, text: string }>}
 */
export function parseLRC(lrcString) {
  if (!lrcString || typeof lrcString !== 'string') return [];

  const lines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let match;
    const timestamps = [];
    timeRegex.lastIndex = 0;

    while ((match = timeRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisStr = match[3].padEnd(3, '0').slice(0, 3);
      const millis = parseInt(millisStr, 10);
      const totalSec = minutes * 60 + seconds + millis / 1000;
      timestamps.push(totalSec);
    }

    const text = trimmed.replace(timeRegex, '').trim();

    for (const time of timestamps) {
      result.push({ time, text });
    }
  }

  // Sort chronologically
  result.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * Fetches synced lyrics from LRCLIB API
 * @param {string} trackName 
 * @param {string} artistName 
 * @param {number} [durationSec]
 * @returns {Promise<{ synced: boolean, lines: Array<{ time: number, text: string }>, plainLyrics: string }>}
 */
export async function fetchLyrics(trackName, artistName, durationSec = 0) {
  if (!trackName) return { synced: false, lines: [], plainLyrics: '' };

  const cleanTrack = trackName
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*\[.*?\]\s*/g, ' ')
    .replace(/-.*remaster.*/i, '')
    .trim();

  const cacheKey = `${artistName || ''} - ${cleanTrack}`.toLowerCase();
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  try {
    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTrack)}`;
    if (artistName) url += `&artist_name=${encodeURIComponent(artistName)}`;
    if (durationSec > 0) url += `&duration=${Math.round(durationSec)}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.syncedLyrics) {
        const parsed = {
          synced: true,
          lines: parseLRC(data.syncedLyrics),
          plainLyrics: data.plainLyrics || ''
        };
        lyricsCache.set(cacheKey, parsed);
        return parsed;
      } else if (data.plainLyrics) {
        const parsed = {
          synced: false,
          lines: data.plainLyrics.split('\n').map((l, i) => ({ time: i * 4, text: l.trim() })),
          plainLyrics: data.plainLyrics
        };
        lyricsCache.set(cacheKey, parsed);
        return parsed;
      }
    }

    // Fallback search
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(artistName ? `${artistName} ${cleanTrack}` : cleanTrack)}`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchItems = await searchRes.json();
      if (Array.isArray(searchItems) && searchItems.length > 0) {
        const best = searchItems.find(i => i.syncedLyrics) || searchItems[0];
        if (best && best.syncedLyrics) {
          const parsed = {
            synced: true,
            lines: parseLRC(best.syncedLyrics),
            plainLyrics: best.plainLyrics || ''
          };
          lyricsCache.set(cacheKey, parsed);
          return parsed;
        } else if (best && best.plainLyrics) {
          const parsed = {
            synced: false,
            lines: best.plainLyrics.split('\n').map((l, i) => ({ time: i * 4, text: l.trim() })),
            plainLyrics: best.plainLyrics
          };
          lyricsCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[lyricsService] fetch failed:', err.message);
  }

  return { synced: false, lines: [], plainLyrics: '' };
}

/**
 * Finds index of active line for given timestamp
 */
export function getActiveLineIndex(lines, currentTimeSec) {
  if (!lines || lines.length === 0) return -1;
  let active = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTimeSec + 0.15) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}
