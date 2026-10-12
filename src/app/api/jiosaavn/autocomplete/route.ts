import { NextRequest, NextResponse } from 'next/server';
import { getAutocompleteSuggestions } from '@/lib/jiosaavn';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || !query.trim()) {
      return NextResponse.json({ songs: [], artists: [], albums: [] });
    }

    const suggestions = await getAutocompleteSuggestions(query.trim());

    return NextResponse.json({
      success: true,
      ...suggestions,
    });
  } catch (error) {
    console.error('Autocomplete API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suggestions', songs: [], artists: [], albums: [] },
      { status: 500 }
    );
  }
}
