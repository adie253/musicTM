import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function cleanTrackTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*(from|feat\.?|ft\.?|remix|version|live|unplugged|ost|soundtrack|reprise|acoustic|lofi|lo-fi)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s*-\s*(from|feat\.?|ft\.?|remastered|single|radio edit).*$/i, '')
    .trim();
}

function getPrimaryArtist(artist: string): string {
  return artist.split(/[,&/]|feat\.|ft\./i)[0].trim();
}

async function fetchLrclibGet(title: string, artist: string, album?: string, duration?: number) {
  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
  });
  if (album && !/online stream|smart radio|smart autoplay/i.test(album)) {
    params.set('album_name', album);
  }
  if (duration && duration > 0) {
    params.set('duration', String(Math.round(duration)));
  }

  const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'MusicTM/1.0' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.syncedLyrics || data?.plainLyrics) {
    return {
      syncedLyrics: data.syncedLyrics || null,
      plainLyrics: data.plainLyrics || null,
      source: 'lrclib',
    };
  }
  return null;
}

async function fetchLrclibSearch(query: string) {
  if (!query.trim()) return null;
  const res = await fetch(
    `https://lrclib.net/api/search?q=${encodeURIComponent(query.trim())}`,
    { headers: { Accept: 'application/json', 'User-Agent': 'MusicTM/1.0' } }
  );
  if (!res.ok) return null;
  const list = await res.json();
  if (!Array.isArray(list) || list.length === 0) return null;

  const withSynced = list.find((item: any) => item?.syncedLyrics);
  if (withSynced) {
    return {
      syncedLyrics: withSynced.syncedLyrics,
      plainLyrics: withSynced.plainLyrics || null,
      source: 'lrclib',
    };
  }

  const withPlain = list.find((item: any) => item?.plainLyrics);
  if (withPlain) {
    return {
      syncedLyrics: null,
      plainLyrics: withPlain.plainLyrics,
      source: 'lrclib',
    };
  }

  return null;
}

async function fetchJioSaavnLyrics(saavnId: string) {
  const cleanId = saavnId.replace(/^saavn_/, '');
  if (!cleanId) return null;
  const res = await fetch(
    `https://www.jiosaavn.com/api.php?__call=lyrics.getLyrics&_format=json&_marker=0&lyrics_id=${encodeURIComponent(cleanId)}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json, text/plain, */*',
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.lyrics) {
    const plain = String(data.lyrics)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (plain) {
      return {
        syncedLyrics: null,
        plainLyrics: plain,
        source: 'jiosaavn',
      };
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get('title') || '').trim();
    const artist = (searchParams.get('artist') || '').trim();
    const album = (searchParams.get('album') || '').trim();
    const duration = parseInt(searchParams.get('duration') || '0', 10);
    const id = (searchParams.get('id') || '').trim();

    if (!title) {
      return NextResponse.json(
        { success: false, syncedLyrics: null, plainLyrics: null },
        { status: 400 }
      );
    }

    const cleanTitle = cleanTrackTitle(title) || title;
    const primaryArtist = getPrimaryArtist(artist);

    // 1. Exact LRCLIB lookup
    if (primaryArtist && primaryArtist.toLowerCase() !== 'unknown artist') {
      const exact = await fetchLrclibGet(cleanTitle, primaryArtist, album, duration).catch(() => null);
      if (exact) {
        return NextResponse.json({ success: true, ...exact });
      }
    }

    // 2. LRCLIB search with title + artist
    const searchQuery =
      primaryArtist && primaryArtist.toLowerCase() !== 'unknown artist'
        ? `${cleanTitle} ${primaryArtist}`
        : cleanTitle;
    const searched = await fetchLrclibSearch(searchQuery).catch(() => null);
    if (searched) {
      return NextResponse.json({ success: true, ...searched });
    }

    // 3. LRCLIB search with title only
    if (searchQuery !== cleanTitle) {
      const titleOnly = await fetchLrclibSearch(cleanTitle).catch(() => null);
      if (titleOnly) {
        return NextResponse.json({ success: true, ...titleOnly });
      }
    }

    // 4. JioSaavn lyrics fallback for saavn tracks
    if (id.startsWith('saavn_')) {
      const saavn = await fetchJioSaavnLyrics(id).catch(() => null);
      if (saavn) {
        return NextResponse.json({ success: true, ...saavn });
      }
    }

    return NextResponse.json({
      success: false,
      syncedLyrics: null,
      plainLyrics: null,
      source: null,
    });
  } catch (error) {
    console.error('Lyrics fetch error:', error);
    return NextResponse.json(
      { success: false, syncedLyrics: null, plainLyrics: null, error: 'Failed to fetch lyrics' },
      { status: 500 }
    );
  }
}
