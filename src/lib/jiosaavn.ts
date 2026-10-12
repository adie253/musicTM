import CryptoJS from 'crypto-js';

const DES_KEY = '38346591';
const JIOSAAVN_BASE_URL = 'https://www.jiosaavn.com/api.php';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
};

export type AudioQuality = '96' | '160' | '320';

export interface JioSaavnSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  duration: number; // in seconds
  image: string; // HD 500x500 image url
  language: string;
  encryptedMediaUrl: string;
  mediaUrls: {
    '96': string;
    '160': string;
    '320': string;
  };
}

/**
 * Decodes HTML entities like &quot;, &amp;, &#039;
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Upgrade thumbnail images to high resolution 500x500
 */
export function upgradeImageUrl(url?: string): string {
  if (!url) return '';
  return url
    .replace(/50x50\.jpg/, '500x500.jpg')
    .replace(/150x150\.jpg/, '500x500.jpg')
    .replace(/^http:/, 'https:');
}

/**
 * Decrypts JioSaavn's DES-ECB encrypted media URL
 */
export function decryptMediaUrl(encryptedUrl: string, quality: AudioQuality = '96'): string {
  if (!encryptedUrl) return '';
  try {
    const key = CryptoJS.enc.Utf8.parse(DES_KEY);
    const decrypted = CryptoJS.DES.decrypt(encryptedUrl, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    let rawUrl = decrypted.toString(CryptoJS.enc.Utf8);
    if (!rawUrl) return '';

    // Upgrade or switch bitrate
    if (quality === '160') {
      rawUrl = rawUrl.replace('_96.mp4', '_160.mp4');
    } else if (quality === '320') {
      rawUrl = rawUrl.replace('_96.mp4', '_320.mp4');
    }

    return rawUrl.replace(/^http:/, 'https:');
  } catch (err) {
    console.error('Failed to decrypt media URL:', err);
    return '';
  }
}

/**
 * Formats a raw JioSaavn song item into clean song object
 */
export function formatSongItem(item: any): JioSaavnSong | null {
  if (!item) return null;

  const encryptedMediaUrl =
    item.encrypted_media_url || item.more_info?.encrypted_media_url;
  if (!encryptedMediaUrl) return null;

  const durationSec = parseInt(item.duration || item.more_info?.duration || '0', 10);

  const media96 = decryptMediaUrl(encryptedMediaUrl, '96');
  const media160 = decryptMediaUrl(encryptedMediaUrl, '160');
  const media320 = decryptMediaUrl(encryptedMediaUrl, '320');

  const title = decodeHtmlEntities(item.song || item.title || 'Unknown Title');
  const artist = decodeHtmlEntities(
    item.primary_artists ||
      item.more_info?.primary_artists ||
      item.singers ||
      item.music ||
      'Various Artists'
  );
  const album = decodeHtmlEntities(item.album || item.more_info?.album || '');

  return {
    id: item.id || String(Math.random()),
    title,
    artist,
    album,
    year: item.year || item.more_info?.year || '',
    duration: durationSec,
    image: upgradeImageUrl(item.image),
    language: item.language || 'hindi',
    encryptedMediaUrl,
    mediaUrls: {
      '96': media96,
      '160': media160,
      '320': media320,
    },
  };
}

/**
 * Search JioSaavn for songs matching a query
 */
export async function searchSongs(
  query: string,
  page = 1,
  limit = 20
): Promise<JioSaavnSong[]> {
  const url = `${JIOSAAVN_BASE_URL}?__call=search.getResults&_format=json&_marker=0&cc=in&p=${page}&n=${limit}&q=${encodeURIComponent(
    query
  )}`;

  try {
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`Search request failed: ${res.status}`);

    const data = await res.json();
    const results = data.results || [];

    const formatted: JioSaavnSong[] = [];
    for (const item of results) {
      const song = formatSongItem(item);
      if (song && song.mediaUrls['96']) {
        formatted.push(song);
      }
    }

    return formatted;
  } catch (error) {
    console.error('JioSaavn search error:', error);
    return [];
  }
}

/**
 * Get trending / top chart songs
 */
export async function getTrendingSongs(limit = 30): Promise<JioSaavnSong[]> {
  try {
    // 1. Fetch top Indian charts
    const chartsRes = await fetch(
      `${JIOSAAVN_BASE_URL}?__call=content.getCharts&api_version=4&_format=json&_marker=0&ctx=web6dot0`,
      { headers: DEFAULT_HEADERS }
    );

    if (chartsRes.ok) {
      const charts = await chartsRes.json();
      if (Array.isArray(charts) && charts.length > 0) {
        // Take the first top playlist (e.g., Hindi India Superhits Top 50 or India Superhits)
        const topChart = charts[0];
        const playlistId = topChart.id;

        const playlistRes = await fetch(
          `${JIOSAAVN_BASE_URL}?__call=playlist.getDetails&_format=json&cc=in&_marker=0&listid=${playlistId}`,
          { headers: DEFAULT_HEADERS }
        );

        if (playlistRes.ok) {
          const playlistData = await playlistRes.json();
          const songs = playlistData.songs || [];
          const formatted: JioSaavnSong[] = [];

          for (const item of songs.slice(0, limit)) {
            const song = formatSongItem(item);
            if (song && song.mediaUrls['96']) {
              formatted.push(song);
            }
          }

          if (formatted.length > 0) return formatted;
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching charts, falling back to search query:', err);
  }

  // Fallback to searching trending hits
  return searchSongs('Top Bollywood Hits 2024', 1, limit);
}

export interface AutocompleteResult {
  songs: Array<{ id: string; title: string; subtitle: string; image: string; url: string }>;
  artists: Array<{ id: string; title: string; subtitle: string; image: string }>;
  albums: Array<{ id: string; title: string; subtitle: string; image: string }>;
}

/**
 * Get autocomplete suggestions as user types
 */
export async function getAutocompleteSuggestions(query: string): Promise<AutocompleteResult> {
  if (!query || !query.trim()) {
    return { songs: [], artists: [], albums: [] };
  }

  const url = `${JIOSAAVN_BASE_URL}?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(
    query.trim()
  )}`;

  try {
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`Autocomplete failed: ${res.status}`);

    const data = await res.json();

    const songs = (data.songs?.data || []).map((s: any) => ({
      id: s.id,
      title: decodeHtmlEntities(s.title),
      subtitle: decodeHtmlEntities(s.description || s.more_info?.singers || s.music || ''),
      image: upgradeImageUrl(s.image),
      url: s.url,
    }));

    const artists = (data.artists?.data || []).map((a: any) => ({
      id: a.id,
      title: decodeHtmlEntities(a.title),
      subtitle: decodeHtmlEntities(a.description || 'Artist'),
      image: upgradeImageUrl(a.image),
    }));

    const albums = (data.albums?.data || []).map((al: any) => ({
      id: al.id,
      title: decodeHtmlEntities(al.title),
      subtitle: decodeHtmlEntities(al.description || al.music || 'Album'),
      image: upgradeImageUrl(al.image),
    }));

    return { songs, artists, albums };
  } catch (err) {
    console.error('Autocomplete error:', err);
    return { songs: [], artists: [], albums: [] };
  }
}

/**
 * Intelligent Next-Song Recommendation Algorithm
 * Given a seed track, finds tonally similar tracks from the same artist, language, and soundtrack.
 */
export async function getSongRecommendations(seed: {
  id?: string;
  title: string;
  artist: string;
  album?: string;
  language?: string;
}): Promise<JioSaavnSong[]> {
  const seedTitleClean = (seed.title || '').toLowerCase().trim();

  // Extract clean primary artist (before comma, &, feat, ft)
  const primaryArtist = (seed.artist || '')
    .split(/[,&/]|feat\.|ft\./i)[0]
    .trim();

  // Clean album name
  const cleanAlbum = (seed.album || '').trim();

  const queries: string[] = [];

  // Query 1: Primary artist + language hits
  if (primaryArtist) {
    const lang = seed.language ? ` ${seed.language}` : '';
    queries.push(`${primaryArtist}${lang} top hits`);
  }

  // Query 2: Album / Movie soundtrack companion songs
  if (cleanAlbum && cleanAlbum.toLowerCase() !== seedTitleClean) {
    queries.push(`${cleanAlbum} songs`);
  }

  // Fallback query if none
  if (queries.length === 0) {
    queries.push(`${seed.title} similar hits`);
  }

  const collectedSongs: JioSaavnSong[] = [];
  const seenIds = new Set<string>();

  // If seed has an ID, mark it so we don't recommend the same song
  if (seed.id) {
    const rawId = seed.id.replace('saavn_', '');
    seenIds.add(rawId);
    seenIds.add(seed.id);
  }

  for (const q of queries) {
    const results = await searchSongs(q, 1, 15);
    for (const song of results) {
      if (!seenIds.has(song.id) && !seenIds.has(`saavn_${song.id}`)) {
        // Also ensure not exact same title
        if (song.title.toLowerCase().trim() !== seedTitleClean) {
          seenIds.add(song.id);
          collectedSongs.push(song);
        }
      }
    }
    if (collectedSongs.length >= 20) break;
  }

  // Fallback to trending if not enough
  if (collectedSongs.length < 5) {
    const trending = await getTrendingSongs(10);
    for (const song of trending) {
      if (!seenIds.has(song.id) && !seenIds.has(`saavn_${song.id}`)) {
        seenIds.add(song.id);
        collectedSongs.push(song);
      }
    }
  }

  return collectedSongs;
}
