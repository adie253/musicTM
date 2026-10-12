import { NextRequest, NextResponse } from 'next/server';
import { getSongRecommendations } from '@/lib/jiosaavn';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title');
    const artist = searchParams.get('artist') || '';
    const album = searchParams.get('album') || '';
    const language = searchParams.get('lang') || '';
    const id = searchParams.get('id') || '';

    if (!title) {
      return NextResponse.json({ results: [] });
    }

    const recommendations = await getSongRecommendations({
      id,
      title,
      artist,
      album,
      language,
    });

    return NextResponse.json({
      success: true,
      seed: { title, artist },
      results: recommendations,
    });
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations', results: [] },
      { status: 500 }
    );
  }
}
