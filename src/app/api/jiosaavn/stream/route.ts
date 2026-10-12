import { NextRequest, NextResponse } from 'next/server';
import { decryptMediaUrl, AudioQuality } from '@/lib/jiosaavn';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const directUrl = searchParams.get('url');
    const encrypted = searchParams.get('encrypted');
    const bitrate = (searchParams.get('bitrate') as AudioQuality) || '96';

    let mediaUrl = directUrl;

    if (!mediaUrl && encrypted) {
      mediaUrl = decryptMediaUrl(encrypted, bitrate);
    }

    if (!mediaUrl) {
      return new NextResponse('Media stream URL or encrypted token missing', {
        status: 400,
      });
    }

    // Ensure bitrate is set correctly if requested
    if (bitrate && mediaUrl.includes('_96.mp4')) {
      if (bitrate === '160') {
        mediaUrl = mediaUrl.replace('_96.mp4', '_160.mp4');
      } else if (bitrate === '320') {
        mediaUrl = mediaUrl.replace('_96.mp4', '_320.mp4');
      }
    }

    const rangeHeader = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Referer: 'https://www.jiosaavn.com/',
    };

    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const upstreamResponse = await fetch(mediaUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      // If 160 or 320 fails on upstream, fallback to 96kbps
      if (mediaUrl.includes('_160.mp4') || mediaUrl.includes('_320.mp4')) {
        const fallbackUrl = mediaUrl
          .replace('_160.mp4', '_96.mp4')
          .replace('_320.mp4', '_96.mp4');
        const fallbackRes = await fetch(fallbackUrl, {
          headers: upstreamHeaders,
        });

        if (fallbackRes.ok || fallbackRes.status === 206) {
          const resHeaders = new Headers();
          resHeaders.set('Content-Type', fallbackRes.headers.get('content-type') || 'audio/mp4');
          resHeaders.set('Accept-Ranges', 'bytes');
          if (fallbackRes.headers.get('content-range')) {
            resHeaders.set('Content-Range', fallbackRes.headers.get('content-range')!);
          }
          if (fallbackRes.headers.get('content-length')) {
            resHeaders.set('Content-Length', fallbackRes.headers.get('content-length')!);
          }
          resHeaders.set('Cache-Control', 'public, max-age=86400');

          return new Response(fallbackRes.body, {
            status: fallbackRes.status,
            headers: resHeaders,
          });
        }
      }

      return new NextResponse(`Upstream audio fetch failed: ${upstreamResponse.status}`, {
        status: upstreamResponse.status,
      });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstreamResponse.headers.get('content-type') || 'audio/mp4');
    headers.set('Accept-Ranges', 'bytes');

    if (upstreamResponse.headers.get('content-range')) {
      headers.set('Content-Range', upstreamResponse.headers.get('content-range')!);
    }
    if (upstreamResponse.headers.get('content-length')) {
      headers.set('Content-Length', upstreamResponse.headers.get('content-length')!);
    }
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers,
    });
  } catch (error) {
    console.error('Audio stream proxy error:', error);
    return new NextResponse('Internal audio relay error', { status: 500 });
  }
}
