import { NextRequest, NextResponse } from 'next/server';
import { searchSongs } from '@/lib/jiosaavn';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    if (!query || !query.trim()) {
      return NextResponse.json({ results: [] });
    }

    const songs = await searchSongs(query.trim(), page, limit);

    return NextResponse.json({
      success: true,
      query: query.trim(),
      results: songs,
    });
  } catch (error) {
    console.error('JioSaavn search route error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search songs', results: [] },
      { status: 500 }
    );
  }
}
