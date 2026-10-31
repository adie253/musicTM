import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const pageToken = searchParams.get('pageToken') || '';
  // Request extra so after filtering non-embeddable we still have enough
  const wantedResults = Math.min(parseInt(searchParams.get('maxResults') || '20', 10), 50);
  const fetchResults = Math.min(wantedResults * 2, 50);

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
    return NextResponse.json(
      { success: false, error: 'YouTube API key not configured. Add YOUTUBE_API_KEY to .env', results: [] },
      { status: 503 }
    );
  }

  try {
    // videoEmbeddable=true → API only returns videos that allow embedding
    // videoSyndicated=true → only videos playable outside YouTube.com
    // No videoCategoryId filter — show ALL YouTube content, not just music
    const url = new URL(`${YT_API_BASE}/search`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('videoEmbeddable', 'true');
    url.searchParams.set('videoSyndicated', 'true');
    url.searchParams.set('q', query || 'Trending Videos 2024');
    url.searchParams.set('maxResults', String(fetchResults));
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const searchRes = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
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
    const items: any[] = data.items || [];

    const ids = items.map((it: any) => it.id?.videoId).filter(Boolean);

    // Fetch contentDetails (duration) + status (embeddable) in one call
    const durationMap: Record<string, string> = {};
    const embeddableSet = new Set<string>();

    if (ids.length > 0) {
      const vUrl = new URL(`${YT_API_BASE}/videos`);
      vUrl.searchParams.set('part', 'contentDetails,status');
      vUrl.searchParams.set('id', ids.join(','));
      vUrl.searchParams.set('key', apiKey);
      const vRes = await fetch(vUrl.toString(), { headers: { Accept: 'application/json' } });
      if (vRes.ok) {
        const vData = await vRes.json();
        for (const v of vData.items || []) {
          durationMap[v.id] = v.contentDetails?.duration || '';
          // Keep only if status says embeddable (absent means true by default)
          if (v.status?.embeddable !== false) {
            embeddableSet.add(v.id);
          }
        }
      }
    }

    const results = items
      .filter((it: any) => it.id?.videoId)
      // Secondary filter: drop any the status API flagged as non-embeddable
      .filter((it: any) => embeddableSet.size === 0 || embeddableSet.has(it.id.videoId))
      .slice(0, wantedResults)
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
