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
