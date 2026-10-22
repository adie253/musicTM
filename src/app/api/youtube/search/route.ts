import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const pageToken = searchParams.get('pageToken') || '';
  const maxResults = Math.min(parseInt(searchParams.get('maxResults') || '20', 10), 50);

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
    return NextResponse.json(
      { success: false, error: 'YouTube API key not configured. Add YOUTUBE_API_KEY to .env', results: [] },
      { status: 503 }
    );
  }

  try {
    // Build search URL
    const url = new URL(`${YT_API_BASE}/search`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('videoCategoryId', '10'); // Music category
    url.searchParams.set('q', query || 'Bollywood Video Songs 2024');
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('key', apiKey);
    url.searchParams.set('regionCode', 'IN');
    url.searchParams.set('relevanceLanguage', 'hi');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const searchRes = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }, // Cache 5 min
    });

    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      console.error('YouTube API error:', errBody);
      return NextResponse.json(
        { success: false, error: 'YouTube API request failed', results: [] },
        { status: searchRes.status }
      );
    }

    const data = await searchRes.json();
    const items = data.items || [];

    // Get video IDs to fetch duration via videos endpoint
    const ids = items.map((it: any) => it.id?.videoId).filter(Boolean);

    let durationMap: Record<string, string> = {};
    if (ids.length > 0) {
      const vUrl = new URL(`${YT_API_BASE}/videos`);
      vUrl.searchParams.set('part', 'contentDetails');
      vUrl.searchParams.set('id', ids.join(','));
      vUrl.searchParams.set('key', apiKey);
      const vRes = await fetch(vUrl.toString(), { headers: { Accept: 'application/json' } });
      if (vRes.ok) {
        const vData = await vRes.json();
        for (const v of vData.items || []) {
          durationMap[v.id] = v.contentDetails?.duration || '';
        }
      }
    }

    const results = items
      .filter((it: any) => it.id?.videoId)
      .map((it: any) => {
        const vid = it.id.videoId;
        const sn = it.snippet || {};
        return {
          id: vid,
          title: sn.title || 'Unknown',
          channelTitle: sn.channelTitle || '',
          thumbnail: sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || '',
          publishedAt: sn.publishedAt || '',
          isoDuration: durationMap[vid] || '',
        };
      });

    return NextResponse.json({
      success: true,
      results,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || 0,
    });
  } catch (err) {
    console.error('YouTube search proxy error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', results: [] },
      { status: 500 }
    );
  }
}
