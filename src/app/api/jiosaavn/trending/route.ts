import { NextRequest, NextResponse } from 'next/server';
import { getTrendingSongs } from '@/lib/jiosaavn';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const songs = await getTrendingSongs(limit);

    return NextResponse.json({
      success: true,
      results: songs,
    });
  } catch (error) {
    console.error('JioSaavn trending route error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending songs', results: [] },
      { status: 500 }
    );
  }
}
