// High-precision Multi-Source Karaoke Engine with True LRC Timings
// Sources: LRCLIB (Exact & Fuzzy), NetEase Cloud Music (Fallback with strict validation)

const lyricsCache = new Map();

/**
 * Decodes standard HTML entities
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Detects if a line is metadata credits rather than actual singable lyrics
 */
function isMetadataLine(text) {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;

  // Metadata headers [ti: ...], [ar: ...], etc.
  if (/^\[(ti|ar|al|by|offset|re|ve|length):/i.test(t)) return true;

  // Asian and Western credit patterns
  const metaRegex = /^(作词|作曲|编曲|制作人|监制|混音|母带|吉他|贝斯|鼓|和音|录音|企划|统筹|出品|发行|词|曲)\s*[:：]/i;
  if (metaRegex.test(t)) return true;

  const westernRegex = /^(written by|composed by|produced by|arranged by|mixed by|mastered by|lyrics by|recorded (at|by)|engineering by|publisher:|label:|vocals by|guitar by|drums by|bass by)\b/i;
  if (westernRegex.test(t)) return true;

  // Service / provider watermarks
  if (/(qq音乐|网易云音乐|lyrics? provided by|sync(ed)? by|transcribed by|lrc by|karaoke by)/i.test(t)) return true;

  // Pure instrumental tag
  if (t === '纯音乐' || t.toLowerCase() === 'instrumental' || t.toLowerCase() === '[instrumental]') return true;

  return false;
}

/**
 * Extracts artist and title when raw title contains separator (e.g. YouTube or browser media)
 */
export function extractArtistAndTitle(rawTitle, rawArtist) {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();

  const isGenericArtist = !artist || /^(spotify|youtube|google chrome|chrome|firefox|opera|edge|yandex|unknown)$/i.test(artist);

  if (isGenericArtist && title) {
    const separators = [' - ', ' — ', ' – ', ' // ', ' | '];
    for (const sep of separators) {
      if (title.includes(sep)) {
        const parts = title.split(sep);
        if (parts.length >= 2) {
          artist = parts[0].trim();
          title = parts.slice(1).join(sep).trim();
          break;
        }
      }
    }
  }

  return { title, artist };
}

/**
 * Cleans track title from metadata noise for higher search match rate
 */
export function cleanTrackTitle(title) {
  if (!title) return '';
  return title
    .replace(/\s*\(feat\.?.*?\)/gi, '')
    .replace(/\s*\[feat\.?.*?\]/gi, '')
    .replace(/\s*\(with\s.*?\)/gi, '')
    .replace(/\s*\(official\s*(music\s*)?video.*?\)/gi, '')
    .replace(/\s*\[official\s*(music\s*)?video.*?\]/gi, '')
    .replace(/\s*\(official\s*audio.*?\)/gi, '')
    .replace(/\s*\(audio.*?\)/gi, '')
    .replace(/\s*\(lyric\s*video.*?\)/gi, '')
    .replace(/\s*\[lyric\s*video.*?\]/gi, '')
    .replace(/\s*\(lyrics?\)/gi, '')
    .replace(/\s*\[lyrics?\]/gi, '')
    .replace(/\s*\(remaster(ed)?.*?\)/gi, '')
    .replace(/\s*\[remaster(ed)?.*?\]/gi, '')
    .replace(/\s*\(radio edit\)/gi, '')
    .replace(/\s*\(deluxe.*?\)/gi, '')
    .replace(/\s*\(bonus\s*track\)/gi, '')
    .replace(/\s*\(speed\s*up.*?\)/gi, '')
    .replace(/\s*\(slowed.*?\)/gi, '')
    .replace(/\s*\(prod\.?.*?\)/gi, '')
    .replace(/\s*\[prod\.?.*?\]/gi, '')
    .replace(/\s*\(ost.*?\)/gi, '')
    .replace(/-.*remaster.*/gi, '')
    .replace(/-.*radio edit.*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Cleans artist name
 */
export function cleanArtistName(artist) {
  if (!artist) return '';
  return artist
    .replace(/\s*(feat\.|ft\.).*$/i, '')
    .replace(/\s*,\s*.*$/, '')
    .replace(/\s*&\s*.*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parses raw LRC string into structured array of timed lines
 * Preserves true LRC timestamps created by the lyricist without artificial tampering!
 * @param {string} lrcString 
 * @returns {Array<{ time: number, text: string, duration: number, endTime: number, nextTime: number }>}
 */
export function parseLRC(lrcString) {
  if (!lrcString || typeof lrcString !== 'string') return [];

  // 1. Check for global [offset:+-ms] header
  let globalOffsetSec = 0;
  const offsetMatch = lrcString.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
  if (offsetMatch) {
    globalOffsetSec = parseInt(offsetMatch[1], 10) / 1000;
  }

  const rawLines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
  const wordTimeRegex = /<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/g;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    timeRegex.lastIndex = 0;
    const timestamps = [];
    let match;

    while ((match = timeRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisStr = (match[3] || '0').padEnd(3, '0').slice(0, 3);
      const millis = parseInt(millisStr, 10);
      const totalSec = Math.max(0, minutes * 60 + seconds + millis / 1000 + globalOffsetSec);
      timestamps.push(totalSec);
    }

    if (timestamps.length === 0) continue;

    let cleanText = trimmed.replace(timeRegex, '').replace(wordTimeRegex, '').trim();
    cleanText = decodeHtmlEntities(cleanText).replace(/\s{2,}/g, ' ').trim();

    // Skip metadata lines (credits, composer, producer, etc.)
    if (isMetadataLine(cleanText)) continue;
    if (!cleanText) continue;

    for (const time of timestamps) {
      result.push({ time, text: cleanText });
    }
  }

  // Sort chronologically
  result.sort((a, b) => a.time - b.time);

  // Eliminate duplicate timestamps
  const uniqueResult = [];
  for (let i = 0; i < result.length; i++) {
    const cur = result[i];
    const prev = uniqueResult[uniqueResult.length - 1];
    if (prev && Math.abs(cur.time - prev.time) < 0.2) {
      if (cur.text.length > prev.text.length) {
        uniqueResult[uniqueResult.length - 1] = cur;
      }
    } else {
      uniqueResult.push(cur);
    }
  }

  // True Musical Line Duration calculation:
  // Each line is active for the full span until the next line begins!
  // If the gap to the next line is long (> 6.5s), it caps at 6.0s so a solo can breathe.
  for (let i = 0; i < uniqueResult.length; i++) {
    const cur = uniqueResult[i];
    const nextTime = uniqueResult[i + 1] ? uniqueResult[i + 1].time : (cur.time + 6.0);
    const rawGap = Math.max(0.5, nextTime - cur.time);

    let duration;
    if (rawGap > 6.5) {
      duration = 5.5; // Long gap: singing lasts ~5.5s, remaining time is instrumental
    } else {
      duration = rawGap; // Normal singing: line lasts all the way to the next line
    }

    cur.duration = duration;
    cur.endTime = cur.time + duration;
    cur.nextTime = nextTime;
  }

  return uniqueResult;
}

/**
 * Smart Vocal Timing Synthesizer: turns plain unsynchronized lyrics into timed karaoke lines
 */
export function synthesizeLrcFromPlain(plainText, durationSec = 180) {
  if (!plainText) return [];

  const rawLines = plainText.split('\n');
  const validLines = [];

  for (const line of rawLines) {
    const t = decodeHtmlEntities(line.trim());
    if (!t) continue;
    if (/^\[(chorus|verse|hook|bridge|intro|outro|куплет|припев|вступление|аутро|интро).*?\]$/i.test(t)) continue;
    if (isMetadataLine(t)) continue;
    validLines.push(t);
  }

  if (validLines.length === 0) return [];

  const totalDuration = Math.max(60, durationSec || 180);
  const introDuration = Math.min(18, Math.max(6, totalDuration * 0.07));
  const outroDuration = Math.min(14, Math.max(5, totalDuration * 0.05));
  const singingPool = Math.max(20, totalDuration - introDuration - outroDuration);

  // Character-weighted line distribution
  const weights = validLines.map((l) => Math.max(4, l.length));
  const totalWeight = weights.reduce((acc, w) => acc + w, 0) || validLines.length;

  const result = [];
  let currentTime = introDuration;

  for (let i = 0; i < validLines.length; i++) {
    const proportion = weights[i] / totalWeight;
    const allocated = singingPool * proportion;
    const duration = Math.max(1.5, Math.min(7.0, allocated));
    const nextTime = currentTime + allocated;

    result.push({
      time: Math.round(currentTime * 100) / 100,
      text: validLines[i],
      duration: Math.round(duration * 100) / 100,
      endTime: Math.round((currentTime + duration) * 100) / 100,
      nextTime: Math.round(nextTime * 100) / 100
    });

    currentTime = nextTime;
  }

  return result;
}

/**
 * Provider 1: LRCLIB API (Exact Match & Query Search)
 */
async function fetchFromLRCLIB(cleanTrack, cleanArtist, durationSec) {
  try {
    // 1. Exact match
    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTrack)}`;
    if (cleanArtist) url += `&artist_name=${encodeURIComponent(cleanArtist)}`;
    if (durationSec > 0) url += `&duration=${Math.round(durationSec)}`;

    const response = await fetch(url, { headers: { 'User-Agent': 'Dynisl/1.0' } });
    if (response.ok) {
      const data = await response.json();
      if (data.syncedLyrics) {
        const lines = parseLRC(data.syncedLyrics);
        if (lines.length >= 2) {
          return { synced: true, lines, plainLyrics: data.plainLyrics || '' };
        }
      }
      if (data.plainLyrics) {
        return { synced: false, plainLyrics: data.plainLyrics };
      }
    }

    // 2. Full query search on LRCLIB
    const query = cleanArtist ? `${cleanArtist} ${cleanTrack}` : cleanTrack;
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Dynisl/1.0' } });
    if (searchRes.ok) {
      const items = await searchRes.json();
      if (Array.isArray(items) && items.length > 0) {
        // Find best match with synced lyrics and matching duration
        let best = items.find((it) => it.syncedLyrics && durationSec > 0 && Math.abs((it.duration || 0) - durationSec) <= 6);
        if (!best) best = items.find((it) => it.syncedLyrics);
        if (!best) best = items[0];

        if (best && best.syncedLyrics) {
          const lines = parseLRC(best.syncedLyrics);
          if (lines.length >= 2) {
            return { synced: true, lines, plainLyrics: best.plainLyrics || '' };
          }
        }
        if (best && best.plainLyrics) {
          return { synced: false, plainLyrics: best.plainLyrics };
        }
      }
    }
  } catch (err) {
    // network or parse error
  }
  return null;
}

/**
 * Provider 2: NetEase Cloud Music (163) - Strict fallback
 * Only used if LRCLIB has nothing, and validates track duration & minimum lines
 */
async function fetchFromNetEase(cleanTrack, cleanArtist, durationSec) {
  try {
    const query = cleanArtist ? `${cleanArtist} ${cleanTrack}` : cleanTrack;
    const searchUrl = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(query)}&type=1&offset=0&limit=3`;

    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const songs = searchData?.result?.songs;
    if (!Array.isArray(songs) || songs.length === 0) return null;

    // Filter candidate whose duration matches within +-6 seconds if durationSec is available
    let chosen = songs[0];
    if (durationSec > 0) {
      const matched = songs.find((s) => Math.abs((s.dt || 0) / 1000 - durationSec) <= 6);
      if (matched) chosen = matched;
    }

    const songId = chosen.id;
    const lyricUrl = `https://music.163.com/api/song/lyric?os=pc&id=${songId}&lv=-1&kv=-1&tv=-1`;

    const lyricRes = await fetch(lyricUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!lyricRes.ok) return null;
    const lyricData = await lyricRes.json();
    const rawLrc = lyricData?.lrc?.lyric;

    if (rawLrc && typeof rawLrc === 'string' && rawLrc.trim()) {
      const lines = parseLRC(rawLrc);
      // Strict check: must have at least 4 real lines (not just 2 credit lines!)
      if (lines.length >= 4) {
        return { synced: true, lines, plainLyrics: '' };
      }
    }
  } catch (err) {
    // network error
  }
  return null;
}

/**
 * Master Lyrics Waterfall
 */
export async function fetchLyrics(rawTrackName, rawArtistName, durationSec = 0) {
  if (!rawTrackName) {
    return { synced: false, lines: [], plainLyrics: '' };
  }

  // 1. Separate & sanitize artist and track
  const extracted = extractArtistAndTitle(rawTrackName, rawArtistName);
  const cleanTrack = cleanTrackTitle(extracted.title);
  const cleanArtist = cleanArtistName(extracted.artist);

  const cacheKey = `${cleanArtist} - ${cleanTrack}`.toLowerCase();
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  // Waterfall Step 1: LRCLIB (Exact Match & Full Search)
  let result = await fetchFromLRCLIB(cleanTrack, cleanArtist, durationSec);

  // Waterfall Step 2: NetEase Cloud Music (Only if LRCLIB failed, with strict verification)
  if (!result || !result.synced) {
    const netEaseResult = await fetchFromNetEase(cleanTrack, cleanArtist, durationSec);
    if (netEaseResult && netEaseResult.synced && netEaseResult.lines.length >= 4) {
      result = netEaseResult;
    }
  }

  // Waterfall Step 3: Smart Synthesizer from Plain Lyrics (if only plain text was found)
  if (result && !result.synced && result.plainLyrics) {
    const synthLines = synthesizeLrcFromPlain(result.plainLyrics, durationSec);
    if (synthLines.length >= 2) {
      result = {
        synced: true,
        lines: synthLines,
        plainLyrics: result.plainLyrics,
        synthesized: true
      };
    }
  }

  // If nothing was found, do NOT synthesize fake ambient interludes! Return clean empty
  if (!result || !result.lines || result.lines.length === 0) {
    result = { synced: false, lines: [], plainLyrics: '' };
  }

  lyricsCache.set(cacheKey, result);
  return result;
}

/**
 * Finds index of active line for given timestamp
 * Exact zero-offset comparison: line[i].time <= currentTimeSec
 */
export function getActiveLineIndex(lines, currentTimeSec) {
  if (!lines || lines.length === 0) return -1;
  if (currentTimeSec < lines[0].time) return -1;

  let active = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTimeSec) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

/**
 * Returns comprehensive karaoke state
 * @param {object} lyricsData 
 * @param {number} currentTimeSec 
 * @param {boolean} [isPlaying=true]
 */
export function getKaraokeState(lyricsData, currentTimeSec, isPlaying = true) {
  if (!lyricsData || !lyricsData.lines || lyricsData.lines.length === 0) {
    return {
      hasLyrics: false,
      isSynced: false,
      isPaused: !isPlaying,
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
  const firstLine = lines[0];

  // 1. Intro check: only if first singing line starts after at least 2.5 seconds
  if (firstLine.time >= 2.5 && currentTimeSec < firstLine.time - 0.3) {
    const countdown = Math.max(0, Math.ceil(firstLine.time - currentTimeSec));
    return {
      hasLyrics: true,
      isSynced,
      isPaused: !isPlaying,
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
      isSynced,
      isPaused: !isPlaying,
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

  const lineDuration = cur.duration || (next ? (next.time - cur.time) : 5.0);
  const elapsed = Math.max(0, currentTimeSec - cur.time);
  const progress = Math.min(1.0, elapsed / Math.max(0.5, lineDuration));

  // 2. Real Instrumental Interlude Check:
  // ONLY occurs if there is a genuine long musical pause (> 6.5 seconds) between lines,
  // and the line has finished singing (> 5.0 seconds have elapsed)
  const isGenuineLongBreak = next && (next.time - cur.time > 6.5);
  const isSingingDone = elapsed >= 5.0;

  if (isGenuineLongBreak && isSingingDone && (next.time - currentTimeSec > 2.0)) {
    const countdown = Math.max(0, Math.ceil(next.time - currentTimeSec));
    return {
      hasLyrics: true,
      isSynced,
      isPaused: !isPlaying,
      mode: 'interlude',
      currentLine: cur.text,
      nextLine: next.text,
      prevLine: prev?.text || '',
      countdown,
      progress: 1.0,
      lineIndex: activeIdx
    };
  }

  // 3. Outro check: last line has finished and 4s have elapsed
  if (!next && elapsed > (lineDuration + 3.0)) {
    return {
      hasLyrics: true,
      isSynced,
      isPaused: !isPlaying,
      mode: 'outro',
      currentLine: cur.text,
      nextLine: '',
      prevLine: prev?.text || '',
      countdown: 0,
      progress: 1.0,
      lineIndex: activeIdx
    };
  }

  // 4. Normal active singing line
  return {
    hasLyrics: true,
    isSynced,
    isPaused: !isPlaying,
    mode: 'singing',
    currentLine: cur.text,
    nextLine: next ? next.text : '',
    prevLine: prev ? prev.text : '',
    countdown: 0,
    progress,
    lineIndex: activeIdx
  };
}
