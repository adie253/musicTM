import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const type = searchParams.get('type') || 'search'; // 'search' | 'trending' | 'details' | 'videos'
  const id = searchParams.get('id') || '';

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'YOUR_TMDB_API_KEY_HERE') {
    return NextResponse.json(
      { success: false, error: 'TMDB API key not configured. Add TMDB_API_KEY to .env', results: [] },
      { status: 503 }
    );
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    let url = '';

    if (type === 'trending') {
      url = `${TMDB_BASE}/trending/movie/week?api_key=${apiKey}&language=en-US&region=IN&page=${page}`;
    } else if (type === 'search' && query) {
      url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=${page}&include_adult=false&region=IN`;
    } else if (type === 'bollywood') {
      // Bollywood = Hindi language movies, most popular
      url = `${TMDB_BASE}/discover/movie?api_key=${apiKey}&language=en-US&with_original_language=hi&sort_by=popularity.desc&page=${page}&region=IN`;
    } else if (type === 'videos' && id) {
      // Get movie trailers/videos
      url = `${TMDB_BASE}/movie/${id}/videos?api_key=${apiKey}&language=en-US`;
    } else if (type === 'details' && id) {
      url = `${TMDB_BASE}/movie/${id}?api_key=${apiKey}&language=en-US&append_to_response=videos,credits`;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid request type', results: [] }, { status: 400 });
    }

    const res = await fetch(url, { next: { revalidate: 600 } });

    if (!res.ok) {
      const errText = await res.text();
      console.error('TMDB API error:', errText);
      return NextResponse.json(
        { success: false, error: 'TMDB request failed', results: [] },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (type === 'videos' || type === 'details') {
      return NextResponse.json({ success: true, data });
    }

    // For search/trending/bollywood return formatted movie list
    const results = (data.results || []).map((m: any) => ({
      id: m.id,
      title: m.title || m.original_title || 'Unknown',
      originalTitle: m.original_title || '',
      overview: m.overview || '',
      releaseDate: m.release_date || '',
      rating: m.vote_average || 0,
      voteCount: m.vote_count || 0,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
      genreIds: m.genre_ids || [],
      language: m.original_language || '',
      popularity: m.popularity || 0,
    }));

    return NextResponse.json({
      success: true,
      results,
      page: data.page || 1,
      totalPages: data.total_pages || 1,
      totalResults: data.total_results || 0,
    });
  } catch (err) {
    console.error('TMDB proxy error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error', results: [] },
      { status: 500 }
    );
  }
}
