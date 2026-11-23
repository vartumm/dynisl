// Service for fetching and parsing synchronized LRC lyrics from LRCLIB
const lyricsCache = new Map();

/**
 * Parses raw LRC string into structured array of timed lines
 * @param {string} lrcString 
 * @returns {Array<{ time: number, text: string, duration: number, endTime: number, nextTime: number }>}
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

  // Calculate durations for each line
  for (let i = 0; i < result.length; i++) {
    const nextTime = result[i + 1] ? result[i + 1].time : (result[i].time + 6.0);
    const rawDuration = Math.max(0.5, nextTime - result[i].time);
    // Typical singing line is between 2.5s and 7.5s, even if next line has a 20s gap
    result[i].duration = Math.min(rawDuration, 7.5);
    result[i].endTime = result[i].time + result[i].duration;
    result[i].nextTime = nextTime;
  }

  return result;
}

/**
 * Cleans track title from metadata noise for higher search match rate
 */
function cleanTrackTitle(title) {
  if (!title) return '';
  return title
    .replace(/\s*\(feat\.?.*?\)/gi, '')
    .replace(/\s*\[feat\.?.*?\]/gi, '')
    .replace(/\s*\(with\s.*?\)/gi, '')
    .replace(/\s*\(official\s*(music\s*)?video.*?\)/gi, '')
    .replace(/\s*\[official\s*(music\s*)?video.*?\]/gi, '')
    .replace(/\s*\(remaster(ed)?.*?\)/gi, '')
    .replace(/\s*\[remaster(ed)?.*?\]/gi, '')
    .replace(/\s*\(lyrics?\)/gi, '')
    .replace(/\s*\(radio edit\)/gi, '')
    .replace(/-.*remaster.*/gi, '')
    .replace(/-.*radio edit.*/gi, '')
    .trim();
}

/**
 * Fetches synced lyrics from LRCLIB API
 * @param {string} trackName 
 * @param {string} artistName 
 * @param {number} [durationSec]
 * @returns {Promise<{ synced: boolean, lines: Array<{ time: number, text: string, duration: number, endTime: number, nextTime: number }>, plainLyrics: string }>}
 */
export async function fetchLyrics(trackName, artistName, durationSec = 0) {
  if (!trackName) return { synced: false, lines: [], plainLyrics: '' };

  const cleanTrack = cleanTrackTitle(trackName);
  const cleanArtist = (artistName || '').replace(/\s*(feat\.|ft\.).*$/i, '').trim();

  const cacheKey = `${cleanArtist} - ${cleanTrack}`.toLowerCase();
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  try {
    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTrack)}`;
    if (cleanArtist) url += `&artist_name=${encodeURIComponent(cleanArtist)}`;
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
          lines: data.plainLyrics.split('\n').filter(Boolean).map((l, i) => ({
            time: i * 4,
            text: l.trim(),
            duration: 4,
            endTime: (i + 1) * 4,
            nextTime: (i + 1) * 4
          })),
          plainLyrics: data.plainLyrics
        };
        lyricsCache.set(cacheKey, parsed);
        return parsed;
      }
    }

    // Fallback search
    const query = cleanArtist ? `${cleanArtist} ${cleanTrack}` : cleanTrack;
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchItems = await searchRes.json();
      if (Array.isArray(searchItems) && searchItems.length > 0) {
        const best = searchItems.find((i) => i.syncedLyrics) || searchItems[0];
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
            lines: best.plainLyrics.split('\n').filter(Boolean).map((l, i) => ({
              time: i * 4,
              text: l.trim(),
              duration: 4,
              endTime: (i + 1) * 4,
              nextTime: (i + 1) * 4
            })),
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
  // If we are before the first line, return -1 (Intro)
  if (currentTimeSec < lines[0].time - 0.2) return -1;

  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTimeSec + 0.15) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

/**
 * Returns comprehensive karaoke state for fluid, professional text tracking
 * @param {object} lyricsData 
 * @param {number} currentTimeSec 
 * @returns {{
 *   hasLyrics: boolean,
 *   isSynced: boolean,
 *   mode: 'none' | 'intro' | 'singing' | 'interlude' | 'outro' | 'plain',
 *   currentLine: string,
 *   nextLine: string,
 *   prevLine: string,
 *   countdown: number,
 *   progress: number,
 *   lineIndex: number
 * }}
 */
export function getKaraokeState(lyricsData, currentTimeSec) {
  if (!lyricsData || !lyricsData.lines || lyricsData.lines.length === 0) {
    return {
      hasLyrics: false,
      isSynced: false,
      mode: 'none',
      currentLine: '',
      nextLine: '',
      prevLine: '',
      countdown: 0,
      progress: 0,
      lineIndex: -1
    };
  }

  const lines = lyricsData.lines;
  const isSynced = Boolean(lyricsData.synced);

  if (!isSynced) {
    const plainIdx = Math.min(lines.length - 1, Math.max(0, Math.floor(currentTimeSec / 4)));
    return {
      hasLyrics: true,
      isSynced: false,
      mode: 'plain',
      currentLine: lines[plainIdx]?.text || '',
      nextLine: lines[plainIdx + 1]?.text || '',
      prevLine: lines[plainIdx - 1]?.text || '',
      countdown: 0,
      progress: 0.5,
      lineIndex: plainIdx
    };
  }

  const firstLine = lines[0];

  // 1. Intro check: before the first singing line starts
  if (currentTimeSec < firstLine.time - 0.3) {
    const countdown = Math.max(0, Math.ceil(firstLine.time - currentTimeSec));
    return {
      hasLyrics: true,
      isSynced: true,
      mode: 'intro',
      currentLine: '',
      nextLine: firstLine.text,
      prevLine: '',
      countdown,
      progress: 0,
      lineIndex: -1
    };
  }

  const activeIdx = getActiveLineIndex(lines, currentTimeSec);

  if (activeIdx < 0) {
    const countdown = Math.max(0, Math.ceil(firstLine.time - currentTimeSec));
    return {
      hasLyrics: true,
      isSynced: true,
      mode: 'intro',
      currentLine: '',
      nextLine: firstLine.text,
      prevLine: '',
      countdown,
      progress: 0,
      lineIndex: -1
    };
  }

  const cur = lines[activeIdx];
  const next = lines[activeIdx + 1];
  const prev = lines[activeIdx - 1];

  const lineDuration = cur.duration || (next ? Math.min(next.time - cur.time, 7.5) : 5.0);
  const elapsed = Math.max(0, currentTimeSec - cur.time);
  const progress = Math.min(1.0, elapsed / lineDuration);

  // 2. Interlude / solo check: line has finished and next line has a gap > 3.2s
  const isLineFinished = elapsed > (lineDuration + 0.6);
  const hasLongGap = next && (next.time - currentTimeSec > 3.0);

  if (isLineFinished && hasLongGap) {
    const countdown = Math.max(0, Math.ceil(next.time - currentTimeSec));
    return {
      hasLyrics: true,
      isSynced: true,
      mode: 'interlude',
      currentLine: cur.text,
      nextLine: next.text,
      prevLine: prev?.text || '',
      countdown,
      progress: 1.0,
      lineIndex: activeIdx
    };
  }

  // 3. Outro check: last line has finished
  if (!next && elapsed > (lineDuration + 2.0)) {
    return {
      hasLyrics: true,
      isSynced: true,
      mode: 'outro',
      currentLine: cur.text,
      nextLine: '',
      prevLine: prev?.text || '',
      countdown: 0,
      progress: 1.0,
      lineIndex: activeIdx
    };
  }

  // 4. Active singing line
  return {
    hasLyrics: true,
    isSynced: true,
    mode: 'singing',
    currentLine: cur.text,
    nextLine: next ? next.text : '',
    prevLine: prev ? prev.text : '',
    countdown: 0,
    progress,
    lineIndex: activeIdx
  };
}
