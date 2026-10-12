'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Play,
  Pause,
  Loader2,
  Sparkles,
  Flame,
  Wifi,
  ShieldCheck,
  Music,
  Plus,
  Check,
  Disc3,
  Sliders,
} from 'lucide-react';
import type { JioSaavnSong } from '@/lib/jiosaavn';

export interface WorkspaceTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  fileSize: number;
  fileName?: string;
  visibility: 'public' | 'private';
  isOwner?: boolean;
  uploaderName?: string;
  uploaderDisplayName?: string;
  createdAt: number;
  streamUrl?: string;
  imageUrl?: string;
  isOnlineStream?: boolean;
}

interface ExploreMusicViewProps {
  currentTrack: WorkspaceTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  onPlayTrack: (track: WorkspaceTrack) => void;
  onAddToPlaylist?: (track: WorkspaceTrack) => void;
  onUpdateOnlineQueue: (tracks: WorkspaceTrack[]) => void;
  activeBitrate: '96' | '160' | '320';
  onChangeBitrate: (bitrate: '96' | '160' | '320') => void;
}

const PRESET_CHIPS = [
  { label: '🔥 Trending Hits', query: '' },
  { label: 'Bollywood Superhits', query: 'Bollywood Top Hits 2024' },
  { label: 'Punjabi Beats', query: 'Top Punjabi Hits Diljit Karan Aujla' },
  { label: 'Arijit Singh Melodies', query: 'Best of Arijit Singh' },
  { label: 'South Cinema (Tamil/Telugu)', query: 'Top South Indian Hits Anirudh' },
  { label: 'Lo-Fi Hindi Chill', query: 'Hindi Lofi Chill Songs' },
  { label: '90s Romantic Classics', query: '90s Bollywood Romantic Songs' },
  { label: 'Global Top Pop', query: 'Top English Pop Hits 2024' },
];

export default function ExploreMusicView({
  currentTrack,
  isPlaying,
  isBuffering,
  onPlayTrack,
  onAddToPlaylist,
  onUpdateOnlineQueue,
  activeBitrate,
  onChangeBitrate,
}: ExploreMusicViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState('🔥 Trending Hits');
  const [songs, setSongs] = useState<JioSaavnSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Fetch trending songs initially
  useEffect(() => {
    loadTrending();
  }, []);

  async function loadTrending() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jiosaavn/trending?limit=30');
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSongs(data.results);
      } else {
        throw new Error('Failed to load trending songs');
      }
    } catch (err) {
      console.error('Error loading trending:', err);
      setError('Could not connect to online catalog. Please check network.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(queryToSearch: string) {
    if (!queryToSearch.trim()) {
      loadTrending();
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/jiosaavn/search?q=${encodeURIComponent(queryToSearch.trim())}&limit=35`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSongs(data.results);
      } else {
        setSongs([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  function handleChipClick(chip: { label: string; query: string }) {
    setSelectedChip(chip.label);
    if (!chip.query) {
      setSearchQuery('');
      loadTrending();
    } else {
      setSearchQuery(chip.query);
      handleSearch(chip.query);
    }
  }

  // Convert JioSaavnSong to WorkspaceTrack
  function mapToWorkspaceTrack(song: JioSaavnSong): WorkspaceTrack {
    const rawMediaUrl =
      song.mediaUrls[activeBitrate] || song.mediaUrls['96'];
    const streamRelayUrl = `/api/jiosaavn/stream?url=${encodeURIComponent(
      rawMediaUrl
    )}&bitrate=${activeBitrate}`;

    // Estimated file size in bytes
    const estimatedKbps = activeBitrate === '96' ? 12 : activeBitrate === '160' ? 20 : 40;
    const estimatedBytes = song.duration * estimatedKbps * 1024;

    return {
      id: `saavn_${song.id}`,
      title: song.title,
      artist: song.artist,
      album: song.album || 'Online Stream',
      duration: song.duration,
      fileSize: estimatedBytes,
      fileName: `${song.title}.m4a`,
      visibility: 'public',
      isOwner: false,
      uploaderName: 'JioSaavn',
      uploaderDisplayName: 'Cloud Stream',
      createdAt: Date.now(),
      streamUrl: streamRelayUrl,
      imageUrl: song.image,
      isOnlineStream: true,
    };
  }

  function playSong(song: JioSaavnSong) {
    const trk = mapToWorkspaceTrack(song);
    // Update queue with all current songs
    const fullQueue = songs.map(mapToWorkspaceTrack);
    onUpdateOnlineQueue(fullQueue);
    onPlayTrack(trk);
  }

  function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function getEstimatedSize(seconds: number, bitrate: '96' | '160' | '320') {
    if (!seconds) return '2.5 MB';
    const kbps = bitrate === '96' ? 12 : bitrate === '160' ? 20 : 40;
    const mb = (seconds * kbps) / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* HERO BANNER: APPLE MUSIC INSPIRED GRADIENT */}
      <div
        style={{
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, #180922 0%, #300c3c 45%, #fa243c 100%)',
          padding: '2.5rem 2rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(250, 36, 60, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Subtle decorative glow orb */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 75, 104, 0.4) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '640px', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            <ShieldCheck size={14} color="#38ef7d" />
            <span>Firewall-Proof • Low Data • Free Streaming</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: '0.75rem',
              color: '#ffffff',
            }}
          >
            All Indian Music, Unlimited &amp; Undetected
          </h1>

          <p
            style={{
              fontSize: '0.95rem',
              color: 'rgba(255, 255, 255, 0.82)',
              lineHeight: 1.55,
              marginBottom: '1.5rem',
            }}
          >
            Stream millions of Bollywood, Punjabi, South Indian, and international tracks directly via our internal encrypted relay. Uses only ~2.5 MB per song with zero firewall detection.
          </p>

          {/* AUDIO QUALITY & DATA CONSUMPTION SELECTOR */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              width: 'fit-content',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
              <Sliders size={14} />
              <span>Data Usage:</span>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => onChangeBitrate('96')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeBitrate === '96' ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>96 kbps (Low Data • ~2MB)</span>
                {activeBitrate === '96' && <span style={{ fontSize: '0.65rem', background: '#38ef7d', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>BEST</span>}
              </button>

              <button
                onClick={() => onChangeBitrate('160')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeBitrate === '160' ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  transition: 'all 0.15s ease',
                }}
              >
                160 kbps (Balanced • ~3.5MB)
              </button>

              <button
                onClick={() => onChangeBitrate('320')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeBitrate === '320' ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  transition: 'all 0.15s ease',
                }}
              >
                320 kbps (HQ • ~8MB)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH BAR & GENRE PILLS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(searchQuery);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '1.1rem',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search any Bollywood, Punjabi, Tamil, Telugu song, artist, movie or album..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(28, 28, 30, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-full)',
                padding: '0.85rem 3rem 0.85rem 2.85rem',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--apple-pink)';
                e.target.style.boxShadow = '0 0 0 3px rgba(250, 36, 60, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-hairline)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  loadTrending();
                }}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={searching}
            className="btn-apple-primary"
            style={{ padding: '0.85rem 1.6rem', flexShrink: 0 }}
          >
            {searching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Search</span>
              </>
            )}
          </button>
        </form>

        {/* QUICK GENRE CHIPS */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.35rem',
            scrollbarWidth: 'none',
          }}
        >
          {PRESET_CHIPS.map((chip) => {
            const isSelected = selectedChip === chip.label;
            return (
              <button
                key={chip.label}
                onClick={() => handleChipClick(chip)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(250, 36, 60, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? 'var(--apple-pink)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 59, 48, 0.15)',
            border: '1px solid rgba(255, 59, 48, 0.3)',
            color: '#ff6b6b',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span>{error}</span>
          <button
            onClick={loadTrending}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* TRACKS GRID / LIST */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={20} color="var(--apple-pink)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {searchQuery ? `Results for "${searchQuery}"` : selectedChip}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
              ({songs.length} songs)
            </span>
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Wifi size={13} color="#30d158" />
            <span>Proxy Stream Active</span>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {(loading || searching) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="apple-skeleton"
                style={{
                  height: '270px',
                  borderRadius: 'var(--radius-lg)',
                }}
              />
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !searching && songs.length === 0 && (
          <div
            className="apple-glass"
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <Disc3 size={48} color="var(--text-tertiary)" />
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>No songs found</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '380px' }}>
              Try searching with a different artist name, movie title, or click one of the trending chips above.
            </div>
            <button onClick={loadTrending} className="btn-apple-secondary" style={{ marginTop: '0.5rem' }}>
              Back to Trending Hits
            </button>
          </div>
        )}

        {/* RESULTS GRID */}
        {!loading && !searching && songs.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {songs.map((song) => {
              const onlineId = `saavn_${song.id}`;
              const isSongActive = currentTrack?.id === onlineId;
              const isSongPlaying = isSongActive && isPlaying;
              const isSongBuffering = isSongActive && isBuffering;

              // Artwork proxy URL (firewall undetectable)
              const proxiedArtworkUrl = `/api/jiosaavn/image?url=${encodeURIComponent(song.image)}`;

              return (
                <div
                  key={song.id}
                  className="apple-glass"
                  style={{
                    padding: '0.9rem',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.2s var(--ease-apple), box-shadow 0.2s var(--ease-apple), border-color 0.2s ease',
                    border: isSongActive ? '1px solid var(--apple-pink)' : '1px solid var(--border-hairline)',
                    background: isSongActive ? 'rgba(250, 36, 60, 0.08)' : 'var(--bg-card)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => playSong(song)}
                >
                  {/* ARTWORK CONTAINER */}
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      position: 'relative',
                      background: 'rgba(255, 255, 255, 0.05)',
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <img
                      src={proxiedArtworkUrl}
                      alt={song.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.3s ease',
                      }}
                    />

                    {/* PLAY OVERLAY BUTTON */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: isSongActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isSongActive ? 1 : 0.85,
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playSong(song);
                        }}
                        style={{
                          width: '3.2rem',
                          height: '3.2rem',
                          borderRadius: '50%',
                          background: isSongActive ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.95)',
                          color: isSongActive ? '#ffffff' : '#000000',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
                          transform: isSongActive ? 'scale(1.08)' : 'scale(1)',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        {isSongBuffering ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : isSongPlaying ? (
                          <Pause size={20} fill="currentColor" />
                        ) : (
                          <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />
                        )}
                      </button>
                    </div>

                    {/* DURATION & DATA USAGE PILL */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0.5rem',
                        left: '0.5rem',
                        right: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        pointerEvents: 'none',
                      }}
                    >
                      <span>{formatTime(song.duration)}</span>
                      <span style={{ color: '#38ef7d' }}>{getEstimatedSize(song.duration, activeBitrate)}</span>
                    </div>
                  </div>

                  {/* METADATA */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1, minHeight: '3.2rem' }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.925rem',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        color: isSongActive ? 'var(--apple-pink)' : 'var(--text-white)',
                      }}
                      title={song.title}
                    >
                      {song.title}
                    </div>

                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                      }}
                      title={song.artist}
                    >
                      {song.artist}
                    </div>
                  </div>

                  {/* ACTION BAR: PLAY & PLAYLIST */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playSong(song);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isSongActive ? 'var(--apple-pink)' : 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0',
                      }}
                    >
                      <Sparkles size={13} />
                      <span>{isSongPlaying ? 'Now Playing' : 'Play'}</span>
                    </button>

                    {onAddToPlaylist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const trk = mapToWorkspaceTrack(song);
                          onAddToPlaylist(trk);
                          setAddedIds((prev) => ({ ...prev, [song.id]: true }));
                          setTimeout(() => {
                            setAddedIds((prev) => ({ ...prev, [song.id]: false }));
                          }, 2500);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: 'none',
                          borderRadius: 'var(--radius-full)',
                          width: '1.75rem',
                          height: '1.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: addedIds[song.id] ? '#30d158' : 'var(--text-white)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        title="Add to Playlist"
                      >
                        {addedIds[song.id] ? <Check size={13} /> : <Plus size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
