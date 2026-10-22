import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'saavncdn.com' || url.hostname.endsWith('.saavncdn.com'))
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new NextResponse('Missing image URL', { status: 400 });
    }

    if (!isAllowedImageUrl(imageUrl)) {
      return new NextResponse('Only HTTPS JioSaavn image URLs are allowed', { status: 400 });
    }

    const res = await fetch(imageUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: 'https://www.jiosaavn.com/',
      },
    });

    if (!res.ok) {
      return new NextResponse('Failed to fetch image', { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await res.arrayBuffer();

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable', // Cache for 7 days
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Image proxy error', { status: 500 });
  }
}
