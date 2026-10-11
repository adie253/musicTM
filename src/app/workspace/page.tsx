'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Plus,
  Trash2,
  Music,
  FolderLock,
  Globe,
  Lock,
  Search,
  Upload,
  LogOut,
  ChevronDown,
  Repeat,
  Shuffle,
  Compass,
  ListMusic,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Heart,
  SlidersHorizontal,
  Share2,
  ListOrdered,
  Sparkles,
  Info,
} from 'lucide-react';

interface Track {
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
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  visibility: 'private' | 'public';
  userId: string;
  creatorName?: string;
  trackCount: number;
  isOwner: boolean;
  createdAt: number;
}

const ARTWORK_GRADIENTS = [
  'linear-gradient(135deg, #fa243c 0%, #ff5b79 100%)',
  'linear-gradient(135deg, #6236ff 0%, #fa243c 100%)',
  'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
  'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)',
];

function getTrackGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ARTWORK_GRADIENTS.length;
  return ARTWORK_GRADIENTS[index];
}

export default function WorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string; email: string; displayName?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'listen' | 'tracks' | 'playlists' | 'upload'>('listen');

  // Data states
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isExpandedPlayer, setIsExpandedPlayer] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState<'public' | 'private'>('public');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Playlist state
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState<'private' | 'public'>('private');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);

  // Fetch session & initial data
  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);

        await Promise.all([loadTracks(), loadPlaylists()]);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  async function loadTracks() {
    try {
      const res = await fetch('/api/tracks');
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks || []);
      }
    } catch (e) {
      console.error('Failed to load tracks', e);
    }
  }

  async function loadPlaylists() {
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists || []);
      }
    } catch (e) {
      console.error('Failed to load playlists', e);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  // Toggle track visibility (Public <-> Private)
  async function toggleTrackVisibility(trackId: string, currentVis: 'public' | 'private') {
    const newVis = currentVis === 'public' ? 'private' : 'public';
    // Optimistic update
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, visibility: newVis } : t))
    );

    try {
      const res = await fetch('/api/tracks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, visibility: newVis }),
      });
      if (!res.ok) {
        // Rollback on failure
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, visibility: currentVis } : t))
        );
      }
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, visibility: currentVis } : t))
      );
    }
  }

  // PWA MediaSession (Native Lock Screen & Notification Center Controls)
  useEffect(() => {
    if (!currentTrack || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Vault Music',
        artwork: [
          { src: '/icons/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextTrack());

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('MediaSession error:', err);
    }
  }, [currentTrack]);

  // Audio Playback
  function playTrack(track: Track) {
    setPlaybackError(null);

    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    setCurrentTrack(track);
    setCurrentTime(0);
    setIsBuffering(true);
    setIsPlaying(true);

    if (audioRef.current) {
      audioRef.current.src = `/api/tracks/${track.id}/stream`;
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => {
          setIsBuffering(false);
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsBuffering(false);
        });
    }
  }

  function togglePlay(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.warn('Play error:', err));
      setIsPlaying(true);
    }
  }

  function handleTimeUpdate() {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  }

  function toggleMute() {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }

  function playNextTrack(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!currentTrack || tracks.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      playTrack(tracks[randomIndex]);
      return;
    }
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    playTrack(tracks[nextIndex]);
  }

  function playPrevTrack(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    playTrack(tracks[prevIndex]);
  }

  // Upload handler
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('visibility', uploadVisibility);

    try {
      const res = await fetch('/api/tracks/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadStatus({ type: 'error', message: data.error || 'Upload failed' });
      } else {
        setUploadStatus({ type: 'success', message: `Added to Library: "${data.track.title}"` });
        setUploadFile(null);
        await loadTracks();
        setActiveTab('tracks');
      }
    } catch {
      setUploadStatus({ type: 'error', message: 'Network connection failed' });
    } finally {
      setUploading(false);
    }
  }

  // Playlist handlers
  async function handleCreatePlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setCreatingPlaylist(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDesc,
          visibility: newPlaylistVisibility,
        }),
      });

      if (res.ok) {
        setNewPlaylistName('');
        setNewPlaylistDesc('');
        setShowNewPlaylistModal(false);
        await loadPlaylists();
      }
    } catch (err) {
      console.error('Create playlist error:', err);
    } finally {
      setCreatingPlaylist(false);
    }
  }

  async function handleViewPlaylist(playlist: Playlist) {
    setSelectedPlaylist(playlist);
    setPlaylistLoading(true);
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylistTracks(data.tracks || []);
      }
    } catch (err) {
      console.error('Fetch playlist detail error:', err);
    } finally {
      setPlaylistLoading(false);
    }
  }

  async function handleAddTrackToPlaylist(playlistId: string) {
    if (!trackToAddToPlaylist) return;
    setAddingToPlaylistId(playlistId);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: trackToAddToPlaylist.id }),
      });
      if (res.ok) {
        setTrackToAddToPlaylist(null);
        await loadPlaylists();
      }
    } catch (err) {
      console.error('Add track error:', err);
    } finally {
      setAddingToPlaylistId(null);
    }
  }

  async function handleDeleteTrack(trackId: string) {
    if (!confirm('Are you sure you want to remove this song from your library?')) return;
    try {
      const res = await fetch(`/api/tracks?id=${trackId}`, { method: 'DELETE' });
      if (res.ok) {
        if (currentTrack?.id === trackId) {
          audioRef.current?.pause();
          setCurrentTrack(null);
          setIsPlaying(false);
        }
        await loadTracks();
      }
    } catch (err) {
      console.error('Delete track error:', err);
    }
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredTracks = tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.album && t.album.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.uploaderName && t.uploaderName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const myUploadedTracks = tracks.filter((t) => t.isOwner);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff' }}>
      {/* Audio Element with Full Event Bindings */}
      <audio
        ref={audioRef}
        loop={isLooping}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onEnded={() => {
          if (!isLooping) playNextTrack();
        }}
        onError={() => {
          setIsBuffering(false);
          setIsPlaying(false);
          setPlaybackError(
            'Unable to stream this audio track. If this file was uploaded before the cloud storage upgrade, please re-upload it.'
          );
        }}
        onLoadedMetadata={handleTimeUpdate}
      />

      {/* DESKTOP SIDEBAR (macOS Apple Music Style - FIXED FULL HEIGHT SO PROFILE NEVER MOVES) */}
      <aside
        className="desktop-only apple-sidebar"
        style={{
          width: '260px',
          position: 'fixed',
          top: 0,
          bottom: 0,
          height: '100vh',
          left: 0,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.75rem 1.25rem',
        }}
      >
        {/* Apple Music Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', paddingLeft: '0.5rem' }}>
          <div style={{
            width: '2.4rem',
            height: '2.4rem',
            borderRadius: '0.6rem',
            background: 'var(--apple-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px var(--apple-pink-glow)',
          }}>
            <Music size={18} fill="#ffffff" color="#ffffff" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>Music</span>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Vault Edition
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="apple-search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Navigation Categories */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', padding: '0 0.5rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Apple Music
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setActiveTab('listen')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'listen' ? 'rgba(250, 36, 60, 0.15)' : 'transparent',
                color: activeTab === 'listen' ? 'var(--apple-pink)' : 'var(--text-white)',
                border: 'none',
                fontWeight: activeTab === 'listen' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Compass size={18} />
              <span>Listen Now</span>
            </button>

            <button
              onClick={() => setActiveTab('tracks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'tracks' ? 'rgba(250, 36, 60, 0.15)' : 'transparent',
                color: activeTab === 'tracks' ? 'var(--apple-pink)' : 'var(--text-white)',
                border: 'none',
                fontWeight: activeTab === 'tracks' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Music size={18} />
              <span>Community Songs ({tracks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('playlists')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'playlists' ? 'rgba(250, 36, 60, 0.15)' : 'transparent',
                color: activeTab === 'playlists' ? 'var(--apple-pink)' : 'var(--text-white)',
                border: 'none',
                fontWeight: activeTab === 'playlists' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <ListMusic size={18} />
              <span>Playlists ({playlists.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'upload' ? 'rgba(250, 36, 60, 0.15)' : 'transparent',
                color: activeTab === 'upload' ? 'var(--apple-pink)' : 'var(--text-white)',
                border: 'none',
                fontWeight: activeTab === 'upload' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Upload size={18} />
              <span>Add Music</span>
            </button>
          </nav>

          {/* Quick Playlists section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem 0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              My Playlists
            </span>
            <button
              onClick={() => setShowNewPlaylistModal(true)}
              style={{ background: 'none', border: 'none', color: 'var(--apple-pink)', cursor: 'pointer' }}
            >
              <Plus size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {playlists.slice(0, 6).map((pl) => (
              <button
                key={pl.id}
                onClick={() => {
                  handleViewPlaylist(pl);
                  setActiveTab('playlists');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedPlaylist?.id === pl.id && activeTab === 'playlists' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pl.visibility === 'public' ? 'var(--apple-green)' : 'var(--apple-pink)' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User Profile Card (Fixed cleanly at sidebar bottom - opens Profile Modal) */}
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div
            onClick={() => setShowProfileModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              overflow: 'hidden',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            <div style={{
              width: '2.2rem',
              height: '2.2rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fa243c 0%, #ff5b79 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px var(--apple-pink-glow)',
            }}>
              <User size={14} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.displayName || user?.username}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--apple-pink)', fontWeight: 500 }}>
                Manage Profile & Privacy
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.35rem' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div style={{
        flex: 1,
        marginLeft: '0px',
        paddingLeft: '0px',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Responsive margin on desktop */}
        <style jsx>{`
          @media (min-width: 769px) {
            div[style*="margin-left"] {
              margin-left: 260px !important;
            }
          }
        `}</style>

        {/* MOBILE TOP BAR */}
        <header className="mobile-only" style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderBottom: '1px solid var(--border-hairline)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.5rem',
              background: 'var(--apple-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Music size={14} fill="#ffffff" color="#ffffff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>Music</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setShowProfileModal(true)}
              style={{
                width: '1.9rem',
                height: '1.9rem',
                borderRadius: '50%',
                background: 'var(--apple-gradient)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <User size={13} />
            </button>
            <button
              onClick={() => setShowNewPlaylistModal(true)}
              style={{ background: 'none', border: 'none', color: 'var(--apple-pink)', cursor: 'pointer' }}
            >
              <Plus size={22} />
            </button>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* MOBILE SEARCH BAR */}
        <div className="mobile-only" style={{ padding: '0.75rem 1.25rem 0.25rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="apple-search-input"
              placeholder="Search community songs & artists"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* PLAYBACK ERROR BANNER */}
        {playbackError && (
          <div style={{
            margin: '1rem 1.5rem 0',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(250, 36, 60, 0.15)',
            border: '1px solid rgba(250, 36, 60, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <AlertCircle size={18} color="var(--apple-pink)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', color: '#ff7a8d' }}>{playbackError}</span>
            </div>
            <button
              onClick={() => setPlaybackError(null)}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* MAIN CONTENT CONTAINER */}
        <main style={{
          flex: 1,
          padding: '1.75rem 1.5rem',
          paddingBottom: currentTrack ? '140px' : '90px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
        }}>
          {/* TAB 1: LISTEN NOW (CLEAN HERO WITHOUT DUPLICATE "NOW STREAMING" BOX) */}
          {activeTab === 'listen' && (
            <div>
              {/* Apple Music Clean Featured Hero Banner */}
              {loading ? (
                <div className="apple-skeleton" style={{ height: '220px', borderRadius: 'var(--radius-xl)', marginBottom: '2.5rem' }} />
              ) : (
                <div style={{
                  borderRadius: 'var(--radius-xl)',
                  background: 'linear-gradient(135deg, #1f0814 0%, #3a0d1e 50%, #fa243c 100%)',
                  padding: '2.5rem 2rem',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: '2.5rem',
                  boxShadow: '0 16px 40px rgba(250, 36, 60, 0.25)',
                }}>
                  <div style={{ maxWidth: '520px', position: 'relative', zIndex: 2 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem' }}>
                      FEATURED VAULT STREAM
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.75rem' }}>
                      Pure Audio Experience
                    </h1>
                    <p style={{ fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      High fidelity streaming, custom playlists, and private storage powered by your cloud vault.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={() => {
                          if (tracks.length > 0) playTrack(tracks[0]);
                        }}
                        className="btn-apple-primary"
                        style={{ padding: '0.75rem 1.75rem' }}
                      >
                        <Play size={18} fill="#ffffff" />
                        <span>Play All Songs</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="btn-apple-secondary"
                        style={{ padding: '0.75rem 1.25rem', backdropFilter: 'blur(20px)' }}
                      >
                        <Upload size={16} />
                        <span>Upload</span>
                      </button>
                    </div>
                  </div>

                  <div style={{
                    position: 'absolute',
                    right: '-30px',
                    bottom: '-30px',
                    width: '260px',
                    height: '260px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(250, 36, 60, 0.4) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                </div>
              )}

              {/* Top Community Tracks Section */}
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Community & Vault Songs</h2>
                  <button
                    onClick={() => setActiveTab('tracks')}
                    style={{ background: 'none', border: 'none', color: 'var(--apple-pink)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    See All
                  </button>
                </div>

                {loading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem 1rem' }}>
                        <div className="apple-skeleton" style={{ width: '3.25rem', height: '3.25rem', borderRadius: '0.65rem' }} />
                        <div style={{ flex: 1 }}>
                          <div className="apple-skeleton" style={{ height: '14px', width: '70%', marginBottom: '8px' }} />
                          <div className="apple-skeleton" style={{ height: '10px', width: '45%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                    {tracks.slice(0, 6).map((track) => {
                      const isTrackActive = currentTrack?.id === track.id;
                      return (
                        <div
                          key={track.id}
                          onClick={() => playTrack(track)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            background: isTrackActive ? 'rgba(250, 36, 60, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                            cursor: 'pointer',
                            transition: 'background 0.15s var(--ease-apple)',
                          }}
                        >
                          <div style={{
                            width: '3.25rem',
                            height: '3.25rem',
                            borderRadius: '0.65rem',
                            background: getTrackGradient(track.id),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                          }}>
                            {isTrackActive && isBuffering ? (
                              <Loader2 size={18} className="animate-spin" color="#ffffff" />
                            ) : isTrackActive && isPlaying ? (
                              <Pause size={18} fill="#ffffff" color="#ffffff" />
                            ) : (
                              <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
                            )}
                          </div>

                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{
                              fontWeight: 600,
                              fontSize: '0.9125rem',
                              color: isTrackActive ? 'var(--apple-pink)' : '#ffffff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {track.title}
                            </div>
                            <div style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {track.artist} • By {track.uploaderName || 'Vault'}
                            </div>
                          </div>

                          {isTrackActive && isPlaying ? (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
                              <div className="eq-bar" />
                              <div className="eq-bar" />
                              <div className="eq-bar" />
                              <div className="eq-bar" />
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78125rem', color: 'var(--text-tertiary)' }}>
                              {formatTime(track.duration)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Playlists Quick Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Playlists</h2>
                  <button
                    onClick={() => setActiveTab('playlists')}
                    style={{ background: 'none', border: 'none', color: 'var(--apple-pink)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    See All
                  </button>
                </div>

                {loading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i}>
                        <div className="apple-skeleton" style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 'var(--radius-lg)', marginBottom: '0.65rem' }} />
                        <div className="apple-skeleton" style={{ height: '14px', width: '80%', marginBottom: '6px' }} />
                        <div className="apple-skeleton" style={{ height: '10px', width: '50%' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
                    {playlists.slice(0, 4).map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => {
                          handleViewPlaylist(pl);
                          setActiveTab('playlists');
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: 'var(--radius-lg)',
                          background: getTrackGradient(pl.id),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '0.65rem',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                        }}>
                          <FolderLock size={32} color="#ffffff" />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pl.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {pl.trackCount} Songs • {pl.visibility}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SONGS / LIBRARY (SHOWS EVERYONE'S PUBLIC SONGS + USER PRIVATE SONGS) */}
          {activeTab === 'tracks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>All Songs</h1>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                    {filteredTracks.length} tracks available across community vault
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="btn-apple-secondary"
                    style={{ fontSize: '0.8125rem' }}
                  >
                    <SlidersHorizontal size={14} />
                    <span>My Uploads & Privacy</span>
                  </button>
                  <button
                    onClick={() => {
                      if (filteredTracks.length > 0) playTrack(filteredTracks[0]);
                    }}
                    className="btn-apple-primary"
                    style={{ padding: '0.6rem 1.4rem' }}
                  >
                    <Play size={16} fill="#ffffff" />
                    <span>Play</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 0.5rem' }}>
                      <div className="apple-skeleton" style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.5rem', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="apple-skeleton" style={{ height: '14px', width: '55%', marginBottom: '8px' }} />
                        <div className="apple-skeleton" style={{ height: '10px', width: '35%' }} />
                      </div>
                      <div className="apple-skeleton" style={{ width: '40px', height: '12px' }} />
                    </div>
                  ))}
                </div>
              ) : filteredTracks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                  <Music size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <h3>No Songs Found</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    Upload audio files or adjust your search.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredTracks.map((track) => {
                    const isTrackActive = currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => playTrack(track)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.85rem 0.5rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          background: isTrackActive ? 'rgba(250, 36, 60, 0.08)' : 'transparent',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {/* Artwork */}
                        <div style={{
                          width: '2.75rem',
                          height: '2.75rem',
                          borderRadius: '0.5rem',
                          background: getTrackGradient(track.id),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {isTrackActive && isBuffering ? (
                            <Loader2 size={16} className="animate-spin" color="#ffffff" />
                          ) : isTrackActive && isPlaying ? (
                            <Pause size={16} fill="#ffffff" color="#ffffff" />
                          ) : (
                            <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
                          )}
                        </div>

                        {/* Title & Artist */}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '0.9375rem',
                            color: isTrackActive ? 'var(--apple-pink)' : '#ffffff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {track.title}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.artist} • By {track.uploaderName || 'Vault'}
                          </div>
                        </div>

                        {/* PUBLIC / PRIVATE TOGGLE BADGE (If user is owner) */}
                        {track.isOwner && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTrackVisibility(track.id, track.visibility);
                            }}
                            title={`Click to make ${track.visibility === 'public' ? 'Private' : 'Public'}`}
                            style={{
                              background: track.visibility === 'public' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                              color: track.visibility === 'public' ? 'var(--apple-green)' : 'var(--text-secondary)',
                              border: `1px solid ${track.visibility === 'public' ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
                              borderRadius: 'var(--radius-full)',
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer',
                            }}
                          >
                            {track.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                            <span>{track.visibility.toUpperCase()}</span>
                          </button>
                        )}

                        {/* Equalizer Waveform */}
                        {isTrackActive && isPlaying && (
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px', marginRight: '0.5rem' }}>
                            <div className="eq-bar" />
                            <div className="eq-bar" />
                            <div className="eq-bar" />
                          </div>
                        )}

                        {/* Duration */}
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                          {formatTime(track.duration)}
                        </span>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setTrackToAddToPlaylist(track)}
                            title="Add to Playlist"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '0.4rem', cursor: 'pointer' }}
                          >
                            <Plus size={18} />
                          </button>
                          {track.isOwner && (
                            <button
                              onClick={() => handleDeleteTrack(track.id)}
                              title="Delete"
                              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', padding: '0.4rem', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PLAYLISTS */}
          {activeTab === 'playlists' && (
            <div>
              {selectedPlaylist ? (
                <div>
                  <button
                    onClick={() => setSelectedPlaylist(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--apple-pink)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      marginBottom: '1.25rem',
                    }}
                  >
                    ← All Playlists
                  </button>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}>
                    <div style={{
                      width: '140px',
                      height: '140px',
                      borderRadius: 'var(--radius-lg)',
                      background: getTrackGradient(selectedPlaylist.id),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
                      flexShrink: 0,
                    }}>
                      <FolderLock size={56} color="#ffffff" />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--apple-pink)' }}>
                          PLAYLIST
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: selectedPlaylist.visibility === 'public' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: selectedPlaylist.visibility === 'public' ? 'var(--apple-green)' : 'var(--text-secondary)',
                        }}>
                          {selectedPlaylist.visibility.toUpperCase()}
                        </span>
                      </div>
                      <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
                        {selectedPlaylist.name}
                      </h1>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                        {selectedPlaylist.description || `Created by ${selectedPlaylist.creatorName || 'You'}`} • {playlistTracks.length} Songs
                      </p>
                      <button
                        onClick={() => {
                          if (playlistTracks.length > 0) playTrack(playlistTracks[0]);
                        }}
                        className="btn-apple-primary"
                        style={{ padding: '0.55rem 1.4rem' }}
                      >
                        <Play size={16} fill="#ffffff" />
                        <span>Play</span>
                      </button>
                    </div>
                  </div>

                  {playlistLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {[1, 2, 3].map((i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 0.5rem' }}>
                          <div className="apple-skeleton" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem' }} />
                          <div style={{ flex: 1 }}>
                            <div className="apple-skeleton" style={{ height: '14px', width: '50%', marginBottom: '6px' }} />
                            <div className="apple-skeleton" style={{ height: '10px', width: '30%' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : playlistTracks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                      No songs in this playlist yet. Add songs from your Library.
                    </div>
                  ) : (
                    <div>
                      {playlistTracks.map((pt) => (
                        <div
                          key={pt.id}
                          onClick={() => playTrack(pt)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.8rem 0.5rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '0.5rem',
                            background: getTrackGradient(pt.id),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {currentTrack?.id === pt.id && isBuffering ? (
                              <Loader2 size={14} className="animate-spin" color="#ffffff" />
                            ) : currentTrack?.id === pt.id && isPlaying ? (
                              <Pause size={14} fill="#ffffff" color="#ffffff" />
                            ) : (
                              <Play size={14} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
                            )}
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: currentTrack?.id === pt.id ? 'var(--apple-pink)' : '#ffffff' }}>
                              {pt.title}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {pt.artist}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                            {formatTime(pt.duration)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
                    <div>
                      <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Playlists</h1>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{playlists.length} playlists available</p>
                    </div>
                    <button
                      onClick={() => setShowNewPlaylistModal(true)}
                      className="btn-apple-primary"
                    >
                      <Plus size={16} />
                      <span>New Playlist</span>
                    </button>
                  </div>

                  {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.25rem' }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i}>
                          <div className="apple-skeleton" style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }} />
                          <div className="apple-skeleton" style={{ height: '14px', width: '70%', marginBottom: '6px' }} />
                          <div className="apple-skeleton" style={{ height: '10px', width: '40%' }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.25rem' }}>
                      {playlists.map((pl) => (
                        <div
                          key={pl.id}
                          onClick={() => handleViewPlaylist(pl)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div style={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: 'var(--radius-lg)',
                            background: getTrackGradient(pl.id),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '0.75rem',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                          }}>
                            <FolderLock size={44} color="#ffffff" />
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pl.name}
                          </div>
                          <div style={{ fontSize: '0.78125rem', color: 'var(--text-tertiary)' }}>
                            {pl.trackCount} Songs • {pl.visibility}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADD MUSIC (UPLOAD WITH VISIBILITY OPTION) */}
          {activeTab === 'upload' && (
            <div style={{ maxWidth: '520px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  Add to Music Vault
                </h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Upload high-quality audio files (stored persistently in your cloud vault)
                </p>
              </div>

              {uploadStatus && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem',
                  background: uploadStatus.type === 'success' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(250, 36, 60, 0.15)',
                  color: uploadStatus.type === 'success' ? 'var(--apple-green)' : '#ff6b81',
                  border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(48, 209, 88, 0.3)' : 'rgba(250, 36, 60, 0.3)'}`,
                }}>
                  {uploadStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{uploadStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleUpload}>
                <div style={{
                  border: '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(28, 28, 30, 0.4)',
                  marginBottom: '1.5rem',
                  cursor: 'pointer',
                }}>
                  <input
                    type="file"
                    id="audio-upload"
                    accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="audio-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{
                      width: '4rem',
                      height: '4rem',
                      borderRadius: '50%',
                      background: 'rgba(250, 36, 60, 0.15)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--apple-pink)',
                      marginBottom: '1rem',
                    }}>
                      <Upload size={28} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.35rem' }}>
                      {uploadFile ? uploadFile.name : 'Choose Audio File'}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                      Supports all major audio formats with auto-metadata
                    </p>
                  </label>
                </div>

                {/* Default Visibility Selector */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                    Initial Privacy Setting
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setUploadVisibility('public')}
                      className={`btn-apple-secondary ${uploadVisibility === 'public' ? 'btn-apple-primary' : ''}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Globe size={15} />
                      <span>Public (Everyone Can Listen)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadVisibility('private')}
                      className={`btn-apple-secondary ${uploadVisibility === 'private' ? 'btn-apple-primary' : ''}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Lock size={15} />
                      <span>Private (Only Me)</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-apple-primary"
                  disabled={!uploadFile || uploading}
                  style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', justifyContent: 'center' }}
                >
                  {uploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Ingesting into Vault...</span>
                    </div>
                  ) : (
                    'Upload Song'
                  )}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* FLOATING MINI PLAYER WITH INLINE PLAYBACK CONTROLS */}
      {currentTrack && (
        <div
          onClick={() => setIsExpandedPlayer(true)}
          style={{
            position: 'fixed',
            bottom: '72px',
            left: '10px',
            right: '10px',
            maxWidth: '920px',
            margin: '0 auto',
            zIndex: 40,
            cursor: 'pointer',
          }}
        >
          {/* Responsive positioning: on desktop dock right of sidebar */}
          <style jsx>{`
            @media (min-width: 769px) {
              div[style*="bottom: '72px'"] {
                bottom: 12px !important;
                left: 272px !important;
                right: 20px !important;
              }
            }
          `}</style>

          <div className="apple-mini-player" style={{
            padding: '0.65rem 1rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* INLINE MINI SCRUB TIMELINE BAR AT TOP */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'rgba(255, 255, 255, 0.12)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  height: '100%',
                  width: `${((currentTime / (duration || currentTrack.duration || 1)) * 100).toFixed(1)}%`,
                  background: 'var(--apple-pink)',
                  boxShadow: '0 0 8px var(--apple-pink)',
                  transition: 'width 0.2s linear',
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}>
              {/* Left: Artwork + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', flex: 1 }}>
                <div
                  className={isPlaying ? 'artwork-playing' : ''}
                  style={{
                    width: '2.85rem',
                    height: '2.85rem',
                    borderRadius: '0.6rem',
                    background: getTrackGradient(currentTrack.id),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <Music size={18} fill="#ffffff" color="#ffffff" />
                </div>

                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentTrack.title}
                  </div>
                  <div style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentTrack.artist} • By {currentTrack.uploaderName || 'Vault'}
                  </div>
                </div>
              </div>

              {/* Center/Right: Full Playback Transport Controls */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Shuffle toggle */}
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  title="Shuffle"
                  className="desktop-only"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isShuffle ? 'var(--apple-pink)' : 'var(--text-tertiary)',
                    padding: '0.35rem',
                    cursor: 'pointer',
                  }}
                >
                  <Shuffle size={16} />
                </button>

                {/* Previous track */}
                <button
                  onClick={(e) => playPrevTrack(e)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.35rem' }}
                >
                  <SkipBack size={19} fill="#ffffff" />
                </button>

                {/* Play / Pause button */}
                <button
                  onClick={(e) => togglePlay(e)}
                  style={{
                    width: '2.4rem',
                    height: '2.4rem',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: 'none',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(255, 255, 255, 0.25)',
                  }}
                >
                  {isBuffering ? (
                    <Loader2 size={16} className="animate-spin" color="#000000" />
                  ) : isPlaying ? (
                    <Pause size={16} fill="#000000" />
                  ) : (
                    <Play size={16} fill="#000000" style={{ marginLeft: '2px' }} />
                  )}
                </button>

                {/* Next track */}
                <button
                  onClick={(e) => playNextTrack(e)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.35rem' }}
                >
                  <SkipForward size={19} fill="#ffffff" />
                </button>

                {/* Loop / Repeat toggle */}
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  title="Repeat"
                  className="desktop-only"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isLooping ? 'var(--apple-pink)' : 'var(--text-tertiary)',
                    padding: '0.35rem',
                    cursor: 'pointer',
                  }}
                >
                  <Repeat size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ULTRA-SOPHISTICATED FULL-SCREEN NOW PLAYING MODAL (Apple Music Style) */}
      {isExpandedPlayer && currentTrack && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: '#0a0a0c',
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem 1.5rem 2.5rem',
          overflowY: 'auto',
        }}>
          {/* DYNAMIC AMBIENT BLURRED GLOW WALLPAPER */}
          <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
          }}>
            <div style={{
              position: 'absolute',
              top: '10%',
              left: '15%',
              width: '450px',
              height: '450px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(250, 36, 60, 0.45) 0%, transparent 70%)',
              filter: 'blur(90px)',
              transform: isPlaying ? 'scale(1.15)' : 'scale(0.95)',
              transition: 'transform 2s ease-in-out',
            }} />
            <div style={{
              position: 'absolute',
              bottom: '20%',
              right: '15%',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(98, 54, 255, 0.4) 0%, transparent 70%)',
              filter: 'blur(90px)',
              transform: isPlaying ? 'scale(1.1)' : 'scale(0.9)',
              transition: 'transform 2.5s ease-in-out',
            }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '540px', margin: '0 auto', width: '100%' }}>
            {/* Top Collapse Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setIsExpandedPlayer(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  borderRadius: '999px',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <ChevronDown size={22} />
              </button>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.5)' }}>
                  PLAYING FROM VAULT
                </span>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                  {currentTrack.album || 'Personal Library'}
                </div>
              </div>

              <button
                onClick={() => setTrackToAddToPlaylist(currentTrack)}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  borderRadius: '999px',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Large 3D Album Artwork Card with Gloss Sheen */}
            <div style={{
              width: '100%',
              aspectRatio: '1 / 1',
              maxWidth: '360px',
              margin: '0 auto 2rem',
              borderRadius: '26px',
              background: getTrackGradient(currentTrack.id),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 26px 70px rgba(0, 0, 0, 0.75), 0 8px 32px var(--apple-pink-glow)',
              overflow: 'hidden',
              transform: isPlaying ? 'scale(1)' : 'scale(0.94)',
              transition: 'transform 0.4s var(--ease-apple)',
            }}>
              <Music size={86} fill="#ffffff" color="#ffffff" />

              {/* Glossy top specular reflection */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '40%',
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, transparent 100%)',
                pointerEvents: 'none',
              }} />

              {/* Live Equalizer Overlay in corner */}
              {isPlaying && (
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(10px)',
                  padding: '6px 10px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px',
                  height: '24px',
                }}>
                  <div className="eq-bar" />
                  <div className="eq-bar" />
                  <div className="eq-bar" />
                  <div className="eq-bar" />
                </div>
              )}
            </div>

            {/* Track Info with Heart & Lossless Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ overflow: 'hidden' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTrack.title}
                </h1>
                <p style={{ fontSize: '1.05rem', color: 'var(--apple-pink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTrack.artist} • By {currentTrack.uploaderName || 'Vault'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                  }}>
                    LOSSLESS
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Apple Master • 24-bit / 48kHz ALAC
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsFavorited(!isFavorited)}
                style={{
                  background: isFavorited ? 'rgba(250, 36, 60, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isFavorited ? 'var(--apple-pink)' : '#ffffff',
                }}
              >
                <Heart size={20} fill={isFavorited ? 'var(--apple-pink)' : 'none'} />
              </button>
            </div>

            {/* Apple Scrub Timeline */}
            <div style={{ marginBottom: '1.75rem' }}>
              <input
                type="range"
                min="0"
                max={duration || currentTrack.duration || 100}
                value={currentTime}
                onChange={handleSeek}
                style={{ width: '100%', height: '5px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.45rem', fontFamily: 'var(--font-mono)' }}>
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime((duration || currentTrack.duration) - currentTime)}</span>
              </div>
            </div>

            {/* Sophisticated Transport Playback Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem',
              padding: '0 0.5rem',
            }}>
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                style={{ background: 'none', border: 'none', color: isShuffle ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: '0.5rem' }}
              >
                <Shuffle size={24} />
              </button>

              <button
                onClick={playPrevTrack}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.5rem' }}
              >
                <SkipBack size={34} fill="#ffffff" />
              </button>

              <button
                onClick={togglePlay}
                style={{
                  width: '4.8rem',
                  height: '4.8rem',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: 'none',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 10px 28px rgba(255, 255, 255, 0.3)',
                }}
              >
                {isBuffering ? (
                  <Loader2 size={34} className="animate-spin" color="#000000" />
                ) : isPlaying ? (
                  <Pause size={34} fill="#000000" />
                ) : (
                  <Play size={34} fill="#000000" style={{ marginLeft: '4px' }} />
                )}
              </button>

              <button
                onClick={playNextTrack}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.5rem' }}
              >
                <SkipForward size={34} fill="#ffffff" />
              </button>

              <button
                onClick={() => setIsLooping(!isLooping)}
                style={{ background: 'none', border: 'none', color: isLooping ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: '0.5rem' }}
              >
                <Repeat size={24} />
              </button>
            </div>

            {/* Apple Volume Slider Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem', padding: '0 0.5rem' }}>
              <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer' }}>
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume1 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{ flex: 1, height: '4px' }}
              />
              <Volume2 size={18} color="rgba(255, 255, 255, 0.6)" />
            </div>

            {/* Bottom Apple Action Icons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <button
                onClick={() => setTrackToAddToPlaylist(currentTrack)}
                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}
              >
                <Plus size={20} />
                <span>Add</span>
              </button>

              <button
                onClick={() => {
                  if (currentTrack.isOwner) {
                    toggleTrackVisibility(currentTrack.id, currentTrack.visibility);
                  }
                }}
                disabled={!currentTrack.isOwner}
                style={{ background: 'none', border: 'none', color: currentTrack.visibility === 'public' ? 'var(--apple-green)' : 'rgba(255, 255, 255, 0.7)', cursor: currentTrack.isOwner ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}
              >
                {currentTrack.visibility === 'public' ? <Globe size={20} /> : <Lock size={20} />}
                <span>{currentTrack.visibility.toUpperCase()}</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  alert('Vault URL copied to clipboard!');
                }}
                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}
              >
                <Share2 size={20} />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="mobile-only" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(18, 18, 20, 0.95)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderTop: '1px solid var(--border-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 35,
      }}>
        <button
          onClick={() => setActiveTab('listen')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            color: activeTab === 'listen' ? 'var(--apple-pink)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 600,
          }}
        >
          <Compass size={20} />
          <span>Listen Now</span>
        </button>

        <button
          onClick={() => setActiveTab('tracks')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            color: activeTab === 'tracks' ? 'var(--apple-pink)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 600,
          }}
        >
          <Music size={20} />
          <span>Songs</span>
        </button>

        <button
          onClick={() => setActiveTab('playlists')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            color: activeTab === 'playlists' ? 'var(--apple-pink)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 600,
          }}
        >
          <ListMusic size={20} />
          <span>Playlists</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            color: activeTab === 'upload' ? 'var(--apple-pink)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 600,
          }}
        >
          <Upload size={20} />
          <span>Add Music</span>
        </button>
      </nav>

      {/* USER PROFILE & PRIVACY MANAGER MODAL */}
      {showProfileModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 85,
          padding: '1.25rem',
        }}>
          <div className="apple-glass" style={{
            width: '100%',
            maxWidth: '540px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '3.2rem',
                  height: '3.2rem',
                  borderRadius: '50%',
                  background: 'var(--apple-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px var(--apple-pink-glow)',
                }}>
                  <User size={20} color="#ffffff" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                    {user?.displayName || user?.username}
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    @{user?.username} • {user?.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowProfileModal(false)}
                className="btn-apple-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }}
              >
                Close
              </button>
            </div>

            {/* Quick Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{myUploadedTracks.length}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Uploads</div>
              </div>
              <div style={{ background: 'rgba(48, 209, 88, 0.1)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--apple-green)' }}>
                  {myUploadedTracks.filter((t) => t.visibility === 'public').length}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--apple-green)', textTransform: 'uppercase' }}>Public</div>
              </div>
              <div style={{ background: 'rgba(250, 36, 60, 0.1)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--apple-pink)' }}>
                  {myUploadedTracks.filter((t) => t.visibility === 'private').length}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--apple-pink)', textTransform: 'uppercase' }}>Private</div>
              </div>
            </div>

            {/* Song Privacy Manager */}
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              My Songs Privacy Controls (Click to toggle Public / Private)
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {myUploadedTracks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  You haven&apos;t uploaded any songs yet. Go to &ldquo;Add Music&rdquo; to upload!
                </div>
              ) : (
                myUploadedTracks.map((track) => (
                  <div
                    key={track.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <div style={{ overflow: 'hidden', flex: 1, marginRight: '0.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {track.artist}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => toggleTrackVisibility(track.id, track.visibility)}
                        style={{
                          background: track.visibility === 'public' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: track.visibility === 'public' ? 'var(--apple-green)' : 'var(--text-secondary)',
                          border: `1px solid ${track.visibility === 'public' ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
                          borderRadius: 'var(--radius-full)',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                        }}
                      >
                        {track.visibility === 'public' ? <Globe size={13} /> : <Lock size={13} />}
                        <span>{track.visibility === 'public' ? 'Public (Visible to All)' : 'Private (Only Me)'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        title="Delete track"
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', padding: '0.35rem', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowProfileModal(false)}
              className="btn-apple-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {showNewPlaylistModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1.25rem',
        }}>
          <div className="apple-glass" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.25rem' }}>New Playlist</h2>
            <form onSubmit={handleCreatePlaylist}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Playlist Name
                </label>
                <input
                  type="text"
                  className="apple-search-input"
                  placeholder="e.g. Chill Beats"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  required
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  className="apple-search-input"
                  placeholder="Description..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  Visibility
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewPlaylistVisibility('private')}
                    className={`btn-apple-secondary ${newPlaylistVisibility === 'private' ? 'btn-apple-primary' : ''}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Lock size={14} />
                    <span>Private</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPlaylistVisibility('public')}
                    className={`btn-apple-secondary ${newPlaylistVisibility === 'public' ? 'btn-apple-primary' : ''}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Globe size={14} />
                    <span>Public</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewPlaylistModal(false)}
                  className="btn-apple-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPlaylist}
                  className="btn-apple-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {creatingPlaylist ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TO PLAYLIST MODAL */}
      {trackToAddToPlaylist && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1.25rem',
        }}>
          <div className="apple-glass" style={{ width: '100%', maxWidth: '380px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem' }}>Add to Playlist</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              &ldquo;{trackToAddToPlaylist.title}&rdquo;
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', marginBottom: '1.25rem' }}>
              {playlists.filter((p) => p.isOwner).length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '1rem' }}>
                  No playlists yet. Create one first!
                </p>
              ) : (
                playlists.filter((p) => p.isOwner).map((pl) => (
                  <button
                    key={pl.id}
                    disabled={addingToPlaylistId === pl.id}
                    onClick={() => handleAddTrackToPlaylist(pl.id)}
                    className="btn-apple-secondary"
                    style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', width: '100%' }}
                  >
                    <span>{pl.name}</span>
                    {addingToPlaylistId === pl.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{pl.trackCount} Songs</span>
                    )}
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setTrackToAddToPlaylist(null)}
              className="btn-apple-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
