'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Play,
  X,
  Loader2,
  Film,
  Star,
  Calendar,
  ChevronRight,
  Globe,
  AlertCircle,
  Clapperboard,
  TrendingUp,
} from 'lucide-react';

interface Movie {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string;
  rating: number;
  voteCount: number;
  poster: string | null;
  backdrop: string | null;
  genreIds: number[];
  language: string;
  popularity: number;
}

interface VideoItem {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 18: 'Drama', 10751: 'Family', 14: 'Fantasy',
  36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery',
  10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
};

const MODE_TABS = [
  { id: 'trending', label: '🔥 Trending', icon: TrendingUp },
  { id: 'bollywood', label: '🇮🇳 Bollywood', icon: Film },
  { id: 'search', label: '🔍 Search', icon: Search },
];

export default function MoviesView() {
  const [mode, setMode] = useState<'trending' | 'bollywood' | 'search'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noApiKey, setNoApiKey] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [trailers, setTrailers] = useState<VideoItem[]>([]);
  const [activeTrailer, setActiveTrailer] = useState<VideoItem | null>(null);
  const [loadingTrailers, setLoadingTrailers] = useState(false);

  async function fetchMovies(type: string, q = '', p = 1) {
    const params = new URLSearchParams({ type, page: String(p) });
    if (q) params.set('q', q);
    const res = await fetch(`/api/tmdb?${params}`);
    const data = await res.json();
    if (!data.success) {
      if (data.error?.includes('not configured')) setNoApiKey(true);
      throw new Error(data.error || 'Failed to fetch movies');
    }
    return data;
  }

  async function loadMovies(type: string, q = '', p = 1, append = false) {
    if (p === 1) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const data = await fetchMovies(type, q, p);
      if (append) {
        setMovies(prev => [...prev, ...(data.results || [])]);
      } else {
        setMovies(data.results || []);
        setSelectedMovie(null);
        setActiveTrailer(null);
        setTrailers([]);
      }
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setPage(1);
    if (mode !== 'search') {
      loadMovies(mode, '', 1);
    } else {
      setMovies([]);
      setLoading(false);
    }
  }, [mode]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setPage(1);
    loadMovies('search', searchQuery.trim(), 1);
  }

  async function loadMore() {
    const nextPage = page + 1;
    const q = mode === 'search' ? searchQuery.trim() : '';
    loadMovies(mode, q, nextPage, true);
  }

  async function openMovie(movie: Movie) {
    setSelectedMovie(movie);
    setTrailers([]);
    setActiveTrailer(null);
    setLoadingTrailers(true);
    try {
      const res = await fetch(`/api/tmdb?type=videos&id=${movie.id}`);
      const data = await res.json();
      if (data.success) {
        const vids: VideoItem[] = (data.data?.results || []).filter(
          (v: VideoItem) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser' || v.type === 'Clip')
        );
        setTrailers(vids);
        const official = vids.find(v => v.official && v.type === 'Trailer');
        setActiveTrailer(official || vids[0] || null);
      }
    } catch (e) {
      console.error('Failed to fetch trailers', e);
    } finally {
      setLoadingTrailers(false);
    }
  }

  function closeMovie() {
    setSelectedMovie(null);
    setActiveTrailer(null);
    setTrailers([]);
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)' }}>
      {/* Hero Header */}
      <div
        style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #16213e 100%)',
          padding: '2.5rem 2rem',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2rem',
          boxShadow: '0 16px 40px rgba(10, 10, 30, 0.6)',
        }}
      >
        <div style={{ position: 'absolute', top: '-30px', right: '5%', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(250, 36, 60, 0.1)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-30px', left: '10%', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(50, 100, 255, 0.12)', filter: 'blur(50px)' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.8rem', borderRadius: '999px',
            background: 'rgba(255,255,255,0.12)', color: '#fff',
            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: '0.75rem',
          }}>
            <Clapperboard size={12} /> Movies
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
            🎬 Movies & Trailers
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', maxWidth: 480 }}>
            Discover trending films, Bollywood blockbusters, and watch official trailers.
          </p>
        </div>
      </div>

      {/* No API key notice */}
      {noApiKey && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem',
          background: 'rgba(250, 180, 0, 0.1)', border: '1px solid rgba(250, 180, 0, 0.3)',
          color: '#f5a623',
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>TMDB API Key Required</div>
            <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'rgba(245, 166, 35, 0.85)' }}>
              1. Go to <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style={{ color: '#f5a623', textDecoration: 'underline' }}>themoviedb.org</a> → Sign up (free) → Get API key<br/>
              2. Open <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4 }}>.env</code> and set <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4 }}>TMDB_API_KEY=your_key</code><br/>
              3. Restart the dev server
            </div>
          </div>
        </div>
      )}

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {MODE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id as any)}
            style={{
              padding: '0.55rem 1.25rem', borderRadius: '999px', cursor: 'pointer',
              border: '1px solid',
              borderColor: mode === tab.id ? 'var(--apple-pink, #fa243c)' : 'rgba(255,255,255,0.12)',
              background: mode === tab.id ? 'rgba(250,36,60,0.15)' : 'rgba(255,255,255,0.05)',
              color: mode === tab.id ? 'var(--apple-pink, #fa243c)' : 'rgba(255,255,255,0.75)',
              fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar (only in search mode) */}
      {mode === 'search' && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search movies (e.g. Pathaan, RRR, KGF)…"
              style={{
                width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem',
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: '#fff',
                fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
            style={{
              padding: '0.8rem 1.5rem', borderRadius: '12px',
              background: 'var(--apple-pink, #fa243c)', color: '#fff',
              border: 'none', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Search
          </button>
        </div>
      )}

      {/* Movie Detail Panel */}
      {selectedMovie && (
        <div style={{
          borderRadius: '16px', overflow: 'hidden', marginBottom: '2rem',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.03)',
          boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
        }}>
          {/* Backdrop */}
          {selectedMovie.backdrop && (
            <div style={{ position: 'relative', height: '220px' }}>
              <img src={selectedMovie.backdrop} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,20,0.95) 100%)' }} />
            </div>
          )}

          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {selectedMovie.poster && (
                <img src={selectedMovie.poster} alt={selectedMovie.title} style={{ width: 100, height: 150, objectFit: 'cover', borderRadius: '10px', flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />
              )}
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.3rem' }}>{selectedMovie.title}</h2>
                {selectedMovie.originalTitle !== selectedMovie.title && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>{selectedMovie.originalTitle}</div>
                )}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#f5a623' }}>
                    <Star size={13} fill="#f5a623" /> {selectedMovie.rating.toFixed(1)} <span style={{ color: 'rgba(255,255,255,0.35)' }}>({selectedMovie.voteCount.toLocaleString()})</span>
                  </span>
                  {selectedMovie.releaseDate && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      <Calendar size={13} /> {selectedMovie.releaseDate.slice(0, 4)}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                    <Globe size={13} /> {selectedMovie.language}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {selectedMovie.genreIds.slice(0, 4).map(g => GENRE_MAP[g]).filter(Boolean).map(g => (
                    <span key={g} style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 600 }}>
                      {g}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 460 }}>
                  {selectedMovie.overview.slice(0, 280)}{selectedMovie.overview.length > 280 ? '…' : ''}
                </p>
              </div>
            </div>

            {/* Trailers */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trailers & Clips
              </div>

              {loadingTrailers ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Loading trailers…
                </div>
              ) : trailers.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>No trailers available for this movie.</div>
              ) : (
                <>
                  {/* Trailer pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {trailers.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setActiveTrailer(v)}
                        style={{
                          padding: '0.35rem 0.85rem', borderRadius: '999px', cursor: 'pointer',
                          border: '1px solid',
                          borderColor: activeTrailer?.id === v.id ? 'var(--apple-pink, #fa243c)' : 'rgba(255,255,255,0.12)',
                          background: activeTrailer?.id === v.id ? 'rgba(250,36,60,0.15)' : 'rgba(255,255,255,0.05)',
                          color: activeTrailer?.id === v.id ? 'var(--apple-pink, #fa243c)' : 'rgba(255,255,255,0.65)',
                          fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.18s',
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                        }}
                      >
                        <Play size={11} fill="currentColor" /> {v.name || v.type}
                      </button>
                    ))}
                  </div>

                  {/* Embedded trailer player */}
                  {activeTrailer && (
                    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
                        <iframe
                          key={activeTrailer.key}
                          src={`https://www.youtube-nocookie.com/embed/${activeTrailer.key}?autoplay=1&rel=0&modestbranding=1`}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={activeTrailer.name}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={closeMovie}
              style={{
                marginTop: '1rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px', padding: '0.4rem 0.9rem', color: 'rgba(255,255,255,0.6)',
                fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <X size={13} /> Close
            </button>
          </div>
        </div>
      )}

      {/* Movie Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading movies…</span>
        </div>
      ) : mode === 'search' && !movies.length ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
          <Clapperboard size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Search for movies above</div>
          <div style={{ fontSize: '0.85rem' }}>Try "Pathaan", "RRR", "Interstellar", etc.</div>
        </div>
      ) : error && !noApiKey ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <Film size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Could not load movies</div>
          <div style={{ fontSize: '0.85rem' }}>{error}</div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '1rem',
          }}>
            {movies.map(movie => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isSelected={selectedMovie?.id === movie.id}
                onClick={() => openMovie(movie)}
              />
            ))}
          </div>

          {page < totalPages && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: '0.75rem 2rem', borderRadius: '999px',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
              >
                {loadingMore ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronRight size={14} />}
                {loadingMore ? 'Loading…' : 'Load more movies'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MovieCard({ movie, isSelected, onClick }: { movie: Movie; isSelected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${isSelected ? 'var(--apple-pink, #fa243c)' : 'rgba(255,255,255,0.07)'}`,
        background: isSelected ? 'rgba(250,36,60,0.06)' : 'rgba(255,255,255,0.03)',
        transform: hovered ? 'translateY(-4px) scale(1.01)' : 'none',
        boxShadow: hovered ? '0 16px 36px rgba(0,0,0,0.5)' : 'none',
        transition: 'all 0.22s ease',
      }}
    >
      {/* Poster */}
      <div style={{ position: 'relative', paddingBottom: '150%', background: '#0d0d1a' }}>
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={36} style={{ color: 'rgba(255,255,255,0.15)' }} />
          </div>
        )}
        {/* Play overlay */}
        <div style={{
          position: 'absolute', inset: 0, background: hovered ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
        }}>
          {hovered && (
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(250,36,60,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(250,36,60,0.5)' }}>
              <Play size={20} fill="#fff" color="#fff" style={{ marginLeft: 3 }} />
            </div>
          )}
        </div>
        {/* Rating badge */}
        {movie.rating > 0 && (
          <div style={{ position: 'absolute', top: '0.45rem', right: '0.45rem', background: 'rgba(0,0,0,0.75)', borderRadius: '6px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 700, color: '#f5a623' }}>
            <Star size={10} fill="#f5a623" /> {movie.rating.toFixed(1)}
          </div>
        )}
        {isSelected && (
          <div style={{ position: 'absolute', top: '0.45rem', left: '0.45rem', background: 'var(--apple-pink, #fa243c)', borderRadius: '999px', padding: '2px 8px', fontSize: '0.62rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>
            ▶ Open
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '0.65rem 0.75rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: '0.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {movie.title}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
          {movie.releaseDate?.slice(0, 4) || ''}
          {movie.language && movie.language !== 'en' ? ` · ${movie.language.toUpperCase()}` : ''}
        </div>
      </div>
    </div>
  );
}
