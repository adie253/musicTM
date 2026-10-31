'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Play,
  X,
  Loader2,
  Film,
  Music2,
  ChevronRight,
  Volume2,
  Maximize2,
  SkipBack,
  SkipForward,
  ExternalLink,
  Flame,
  Mic2,
  Guitar,
  Headphones,
  AlertCircle,
  Youtube,
  Tv2,
  Laugh,
  Trophy,
  Globe,
} from 'lucide-react';

interface VideoResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  isoDuration: string;
}

const PRESET_CHIPS = [
  { label: '🔥 Trending', query: 'Trending Videos 2024' },
  { label: '🎵 Music Videos', query: 'Official Music Video 2024' },
  { label: '🎬 Bollywood', query: 'Bollywood Songs 2024 Official Video' },
  { label: '🎤 Arijit Singh', query: 'Arijit Singh Official Video Songs' },
  { label: '🎸 English Pop', query: 'English Pop Music Video 2024' },
  { label: '😂 Comedy', query: 'Funny Videos 2024' },
  { label: '🏏 Sports', query: 'Sports Highlights 2024' },
  { label: '🎮 Gaming', query: 'Gaming Videos 2024' },
  { label: '🌍 Vlogs', query: 'Travel Vlog 2024' },
  { label: '📚 Education', query: 'Educational Videos 2024' },
  { label: '🎵 Diljit Dosanjh', query: 'Diljit Dosanjh Punjabi Video Songs Official' },
  { label: '🎵 AP Dhillon', query: 'AP Dhillon Official Music Video' },
];

/** Parse ISO 8601 duration to mm:ss */
function parseIsoDuration(iso: string): string {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoSongsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState(PRESET_CHIPS[0].label);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noApiKey, setNoApiKey] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  async function fetchVideos(query: string, pageToken?: string) {
    const params = new URLSearchParams({ q: query, maxResults: '20' });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`/api/youtube/search?${params}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      if (data.error?.includes('not configured')) {
        setNoApiKey(true);
      }
      throw new Error(data.error || 'Failed to fetch videos');
    }

    return data;
  }

  async function loadChip(chip: typeof PRESET_CHIPS[0]) {
    setActiveChip(chip.label);
    setSearchQuery('');
    setLoading(true);
    setError(null);
    setNextPageToken(null);
    setActiveVideo(null);
    setIframeError(false);
    try {
      const data = await fetchVideos(chip.query);
      setVideos(data.results || []);
      setNextPageToken(data.nextPageToken || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    setActiveChip('');
    setNextPageToken(null);
    try {
      const data = await fetchVideos(q.trim());
      setVideos(data.results || []);
      setNextPageToken(data.nextPageToken || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  }

  async function loadMore() {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const query = searchQuery.trim() || PRESET_CHIPS.find(c => c.label === activeChip)?.query || '';
      const data = await fetchVideos(query, nextPageToken);
      setVideos(prev => [...prev, ...(data.results || [])]);
      setNextPageToken(data.nextPageToken || null);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadChip(PRESET_CHIPS[0]);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch(searchQuery);
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)' }}>
      {/* Hero Header */}
      <div
        style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          padding: '2.5rem 2rem',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2rem',
          boxShadow: '0 16px 40px rgba(48, 43, 99, 0.5)',
        }}
      >
        {/* Floating orbs */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(250, 36, 60, 0.15)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '20%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(98, 54, 255, 0.2)', filter: 'blur(40px)' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.8rem', borderRadius: '999px',
            background: 'rgba(255,255,255,0.12)', color: '#fff',
            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: '0.75rem',
          }}>
            <Film size={12} /> YouTube
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
            📺 YouTube
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: 480 }}>
            Stream any video from YouTube — music, sports, vlogs, comedy &amp; more. Securely embedded.
          </p>

          {/* Search bar */}
          <div style={{ position: 'relative', maxWidth: 520 }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }} />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search videos, channels, topics…"
              style={{
                width: '100%', padding: '0.85rem 3rem 0.85rem 2.75rem',
                borderRadius: '999px', border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                fontSize: '0.9rem', outline: 'none', backdropFilter: 'blur(10px)',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                style={{ position: 'absolute', right: '4rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={() => handleSearch(searchQuery)}
              disabled={!searchQuery.trim() || searching}
              style={{
                position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)',
                padding: '0.55rem 1rem', borderRadius: '999px',
                background: 'var(--apple-pink, #fa243c)', color: '#fff',
                border: 'none', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}
            >
              {searching ? <Loader2 size={13} className="spin" /> : 'Search'}
            </button>
          </div>
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
            <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>YouTube API Key Required</div>
            <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'rgba(245, 166, 35, 0.85)' }}>
              1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: '#f5a623', textDecoration: 'underline' }}>Google Cloud Console</a> → Create project → Enable <strong>YouTube Data API v3</strong><br/>
              2. Create an API key → copy it<br/>
              3. Open <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4 }}>.env</code> and set <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4 }}>YOUTUBE_API_KEY=your_key</code><br/>
              4. Restart the dev server
            </div>
          </div>
        </div>
      )}

      {/* Preset chips */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {PRESET_CHIPS.map(chip => (
          <button
            key={chip.label}
            onClick={() => loadChip(chip)}
            style={{
              padding: '0.45rem 1rem', borderRadius: '999px',
              border: '1px solid',
              borderColor: activeChip === chip.label ? 'var(--apple-pink, #fa243c)' : 'rgba(255,255,255,0.12)',
              background: activeChip === chip.label ? 'rgba(250,36,60,0.15)' : 'rgba(255,255,255,0.05)',
              color: activeChip === chip.label ? 'var(--apple-pink, #fa243c)' : 'rgba(255,255,255,0.75)',
              fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Inline Video Player */}
      {activeVideo && (
        <div style={{
          borderRadius: '16px', overflow: 'hidden', marginBottom: '2rem',
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#000', boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}>
          {iframeError ? (
            /* Fallback when embed is blocked */
            <div style={{
              position: 'relative', paddingBottom: '56.25%', background: '#0d0d0d',
              overflow: 'hidden',
            }}>
              {activeVideo.thumbnail && (
                <img
                  src={activeVideo.thumbnail}
                  alt={activeVideo.title}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35, filter: 'blur(4px)' }}
                />
              )}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem',
              }}>
                <div style={{ fontSize: '2.5rem' }}>🚫</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', textAlign: 'center' }}>Embedding disabled for this video</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', textAlign: 'center', maxWidth: 320 }}>
                  The uploader has restricted embedding. Watch it directly on YouTube.
                </div>
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.65rem 1.5rem', borderRadius: '999px',
                    background: '#ff0000', color: '#fff',
                    fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(255,0,0,0.4)',
                  }}
                >
                  <ExternalLink size={15} /> Watch on YouTube
                </a>
              </div>
            </div>
          ) : (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  key={activeVideo.id}
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0&modestbranding=1`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  title={activeVideo.title}
                  onError={() => setIframeError(true)}
                />
              </div>
          )}
          <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeVideo.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>{activeVideo.channelTitle}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <a
                href={`https://www.youtube.com/watch?v=${activeVideo.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.4rem 0.8rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
              >
                <ExternalLink size={13} /> YouTube
              </a>
              <button
                onClick={() => { setActiveVideo(null); setIframeError(false); }}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.4rem 0.8rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <X size={13} /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading videos…</span>
        </div>
      ) : error && !noApiKey ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <Film size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Could not load videos</div>
          <div style={{ fontSize: '0.85rem' }}>{error}</div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {videos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                isActive={activeVideo?.id === video.id}
                onPlay={() => setActiveVideo(video)}
              />
            ))}
          </div>

          {/* Load more */}
          {nextPageToken && (
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
                {loadingMore ? 'Loading…' : 'Load more videos'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VideoCard({
  video,
  isActive,
  onPlay,
}: {
  video: VideoResult;
  isActive: boolean;
  onPlay: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const duration = parseIsoDuration(video.isoDuration);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
      style={{
        borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${isActive ? 'var(--apple-pink, #fa243c)' : 'rgba(255,255,255,0.08)'}`,
        background: isActive ? 'rgba(250,36,60,0.08)' : 'rgba(255,255,255,0.03)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 12px 30px rgba(0,0,0,0.4)' : 'none',
        transition: 'all 0.22s ease',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#111' }}>
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
            <Music2 size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        )}
        {/* Overlay play button */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hovered ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
          transition: 'background 0.2s',
        }}>
          {hovered && (
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: 'rgba(250,36,60,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(250,36,60,0.5)',
            }}>
              <Play size={22} fill="#fff" color="#fff" style={{ marginLeft: 3 }} />
            </div>
          )}
        </div>
        {/* Duration badge */}
        {duration && (
          <div style={{
            position: 'absolute', bottom: '0.5rem', right: '0.5rem',
            background: 'rgba(0,0,0,0.8)', color: '#fff',
            fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
          }}>
            {duration}
          </div>
        )}
        {isActive && (
          <div style={{
            position: 'absolute', top: '0.5rem', left: '0.5rem',
            background: 'var(--apple-pink, #fa243c)', color: '#fff',
            fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            ▶ Playing
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '0.75rem' }}>
        <div style={{
          fontSize: '0.85rem', fontWeight: 600, color: '#fff',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', lineHeight: 1.4, marginBottom: '0.3rem',
        }}>
          {video.title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
          {video.channelTitle}
        </div>
      </div>
    </div>
  );
}
