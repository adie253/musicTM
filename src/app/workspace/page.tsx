'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  LogOut,
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Music,
  FolderLock,
  Globe,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  fileSize: number;
  fileName?: string;
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

export default function WorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string; email: string; displayName?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'upload'>('tracks');
  
  // Data states
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Playlist modal state
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState<'private' | 'public'>('private');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);

  // Add to playlist modal
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);

  // Fetch user session and initial data
  useEffect(() => {
    async function loadSessionAndData() {
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
    loadSessionAndData();
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

  // Audio Playback handlers
  function playTrack(track: Track) {
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
    setIsPlaying(true);

    if (audioRef.current) {
      audioRef.current.src = `/api/tracks/${track.id}/stream`;
      audioRef.current.load();
      audioRef.current.play().catch((err) => console.warn('Autoplay error:', err));
    }
  }

  function togglePlay() {
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

  function playNextTrack() {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    playTrack(tracks[nextIndex]);
  }

  function playPrevTrack() {
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

    try {
      const res = await fetch('/api/tracks/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadStatus({ type: 'error', message: data.error || 'Upload rejected' });
      } else {
        setUploadStatus({ type: 'success', message: `Encrypted audio stored: "${data.track.title}"` });
        setUploadFile(null);
        await loadTracks();
        setActiveTab('tracks');
      }
    } catch {
      setUploadStatus({ type: 'error', message: 'Network transmission failure' });
    } finally {
      setUploading(false);
    }
  }

  // Delete track
  async function handleDeleteTrack(trackId: string) {
    if (!confirm('Are you sure you want to permanently delete this track?')) return;
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

  // Create playlist
  async function handleCreatePlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

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
    }
  }

  // View playlist detail
  async function handleViewPlaylist(playlist: Playlist) {
    setSelectedPlaylist(playlist);
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylistTracks(data.tracks || []);
      }
    } catch (err) {
      console.error('Fetch playlist detail error:', err);
    }
  }

  // Add track to playlist
  async function handleAddTrackToPlaylist(playlistId: string) {
    if (!trackToAddToPlaylist) return;
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
      console.error('Add to playlist error:', err);
    }
  }

  // Delete playlist
  async function handleDeletePlaylist(playlistId: string) {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist(null);
        }
        await loadPlaylists();
      }
    } catch (err) {
      console.error('Delete playlist error:', err);
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
      t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: currentTrack ? '7.5rem' : '2rem' }}>
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={playNextTrack}
        onLoadedMetadata={handleTimeUpdate}
      />

      {/* Camouflage Top Navigation Bar */}
      <header style={{
        background: 'rgba(10, 14, 22, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-dim)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4.25rem',
        }}>
          {/* Stealth Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
            }}>
              <HardDrive size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>
                  Aether Vault
                </span>
                <span className="badge badge-stealth" style={{ fontSize: '0.7rem' }}>
                  NODE 01
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Authenticated: {user?.username} ({user?.email})
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{
            position: 'relative',
            width: '320px',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.85rem',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search encrypted media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem', height: '2.4rem', fontSize: '0.8125rem' }}
            />
          </div>

          {/* User Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.5rem 0.85rem' }}
            >
              <LogOut size={15} />
              <span>Lock Session</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="container" style={{ marginTop: '2rem' }}>
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-dim)',
          paddingBottom: '1rem',
          marginBottom: '2rem',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('tracks')}
              className={`btn ${activeTab === 'tracks' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.85rem' }}
            >
              <Music size={16} />
              <span>Media Library ({tracks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('playlists')}
              className={`btn ${activeTab === 'playlists' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.85rem' }}
            >
              <FolderLock size={16} />
              <span>Playlists ({playlists.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.85rem' }}
            >
              <Upload size={16} />
              <span>Upload Stream</span>
            </button>
          </div>

          {activeTab === 'playlists' && (
            <button
              onClick={() => setShowNewPlaylistModal(true)}
              className="btn btn-primary"
              style={{ fontSize: '0.8125rem' }}
            >
              <Plus size={16} />
              <span>New Playlist</span>
            </button>
          )}
        </div>

        {/* TAB 1: MEDIA LIBRARY */}
        {activeTab === 'tracks' && (
          <div>
            {filteredTracks.length === 0 ? (
              <div className="glass-panel" style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: 'var(--text-secondary)',
              }}>
                <Music size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h3 style={{ marginBottom: '0.5rem' }}>No Audio Tracks in Vault</h3>
                <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Upload your first audio file to start private streaming.
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="btn btn-primary"
                >
                  <Upload size={16} />
                  <span>Go to Upload Center</span>
                </button>
              </div>
            ) : (
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{
                      borderBottom: '1px solid var(--border-dim)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      <th style={{ padding: '1rem 1.25rem', width: '3rem' }}>#</th>
                      <th style={{ padding: '1rem' }}>Title & Artist</th>
                      <th style={{ padding: '1rem' }}>Album</th>
                      <th style={{ padding: '1rem' }}>Duration</th>
                      <th style={{ padding: '1rem' }}>Size</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTracks.map((track, idx) => {
                      const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
                      return (
                        <tr
                          key={track.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            background: currentTrack?.id === track.id ? 'rgba(6, 182, 212, 0.06)' : 'transparent',
                            transition: 'background var(--transition-fast)',
                          }}
                        >
                          <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <button
                              onClick={() => playTrack(track)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: isCurrentPlaying ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {isCurrentPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                          </td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <div style={{
                              fontWeight: 600,
                              color: currentTrack?.id === track.id ? 'var(--accent-cyan)' : 'var(--text-primary)',
                              fontSize: '0.9125rem',
                            }}>
                              {track.title}
                            </div>
                            <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
                              {track.artist}
                            </div>
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {track.album || '—'}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {formatTime(track.duration)}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {(track.fileSize / (1024 * 1024)).toFixed(1)} MB
                          </td>
                          <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => setTrackToAddToPlaylist(track)}
                                title="Add to Playlist"
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                              >
                                <Plus size={14} />
                                <span>Add to Playlist</span>
                              </button>
                              <button
                                onClick={() => handleDeleteTrack(track.id)}
                                title="Delete Track"
                                className="btn btn-danger"
                                style={{ padding: '0.4rem 0.6rem' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PLAYLISTS */}
        {activeTab === 'playlists' && (
          <div>
            {selectedPlaylist ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                }}>
                  <div>
                    <button
                      onClick={() => setSelectedPlaylist(null)}
                      className="btn btn-secondary"
                      style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}
                    >
                      ← Back to All Playlists
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h2>{selectedPlaylist.name}</h2>
                      <span className={`badge ${selectedPlaylist.visibility === 'public' ? 'badge-public' : 'badge-private'}`}>
                        {selectedPlaylist.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                        {selectedPlaylist.visibility.toUpperCase()}
                      </span>
                    </div>
                    {selectedPlaylist.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {selectedPlaylist.description}
                      </p>
                    )}
                  </div>

                  {selectedPlaylist.isOwner && (
                    <button
                      onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                      className="btn btn-danger"
                    >
                      <Trash2 size={16} />
                      <span>Delete Playlist</span>
                    </button>
                  )}
                </div>

                {playlistTracks.length === 0 ? (
                  <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>This playlist contains no tracks yet.</p>
                  </div>
                ) : (
                  <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{
                          borderBottom: '1px solid var(--border-dim)',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                        }}>
                          <th style={{ padding: '1rem', width: '3rem' }}>#</th>
                          <th style={{ padding: '1rem' }}>Title</th>
                          <th style={{ padding: '1rem' }}>Artist</th>
                          <th style={{ padding: '1rem' }}>Duration</th>
                          <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playlistTracks.map((pt, idx) => (
                          <tr key={pt.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <button
                                onClick={() => playTrack(pt)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: currentTrack?.id === pt.id && isPlaying ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                }}
                              >
                                {currentTrack?.id === pt.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                              </button>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>{pt.title}</td>
                            <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)' }}>{pt.artist}</td>
                            <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)' }}>{formatTime(pt.duration)}</td>
                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                              {selectedPlaylist.isOwner && (
                                <button
                                  onClick={async () => {
                                    await fetch(`/api/playlists/${selectedPlaylist.id}?trackId=${pt.id}`, { method: 'DELETE' });
                                    handleViewPlaylist(selectedPlaylist);
                                  }}
                                  className="btn btn-danger"
                                  style={{ padding: '0.35rem 0.6rem' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem',
              }}>
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    className="glass-panel-interactive"
                    style={{ padding: '1.5rem', cursor: 'pointer' }}
                    onClick={() => handleViewPlaylist(pl)}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                    }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-indigo)',
                      }}>
                        <FolderLock size={18} />
                      </div>
                      <span className={`badge ${pl.visibility === 'public' ? 'badge-public' : 'badge-private'}`}>
                        {pl.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                        {pl.visibility.toUpperCase()}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{pl.name}</h3>
                    <p style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '1rem',
                      minHeight: '2.4rem',
                    }}>
                      {pl.description || 'No description provided.'}
                    </p>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-dim)',
                      paddingTop: '0.75rem',
                    }}>
                      <span>{pl.trackCount} tracks</span>
                      <span>By {pl.creatorName || 'You'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: UPLOAD CENTER */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="glass-panel" style={{ padding: '2.5rem 2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)',
                  marginBottom: '1rem',
                }}>
                  <Upload size={24} />
                </div>
                <h2>Encrypted Media Ingestion</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Files are securely ingested into the protected data vault.
                </p>
              </div>

              {uploadStatus && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  fontSize: '0.8125rem',
                  background: uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                  color: uploadStatus.type === 'success' ? '#34d399' : '#fda4af',
                  border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                }}>
                  {uploadStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{uploadStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleUpload}>
                <div style={{
                  border: '2px dashed var(--border-bright)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.01)',
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
                    <HardDrive size={36} style={{ margin: '0 auto 0.75rem', color: 'var(--accent-cyan)' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.35rem' }}>
                      {uploadFile ? uploadFile.name : 'Select or Drop Audio File'}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Supports MP3, FLAC, WAV, OGG, AAC, M4A (Metadata auto-parsed)
                    </p>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!uploadFile || uploading}
                  style={{ width: '100%', padding: '0.85rem' }}
                >
                  {uploading ? (
                    'Processing & Encrypting...'
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Ingest to Vault</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* FIXED BOTTOM AUDIO PLAYER BAR */}
      {currentTrack && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '5.5rem',
          background: 'rgba(9, 12, 18, 0.94)',
          backdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border-bright)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          zIndex: 50,
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.6)',
        }}>
          {/* Left: Track Information */}
          <div style={{ width: '280px', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.6rem',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px var(--accent-cyan-glow)',
            }}>
              <Music size={20} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}>
                {currentTrack.title}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}>
                {currentTrack.artist}
              </div>
            </div>
          </div>

          {/* Center: Controls & Timeline */}
          <div style={{
            flex: 1,
            maxWidth: '620px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.35rem',
          }}>
            {/* Control buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={playPrevTrack}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <SkipBack size={18} />
              </button>
              <button
                onClick={togglePlay}
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: 'none',
                  color: '#07090e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(255, 255, 255, 0.3)',
                }}
              >
                {isPlaying ? <Pause size={18} fill="#07090e" /> : <Play size={18} fill="#07090e" style={{ marginLeft: '2px' }} />}
              </button>
              <button
                onClick={playNextTrack}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Range Scrub Bar */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || currentTrack.duration || 100}
                value={currentTime}
                onChange={handleSeek}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {formatTime(duration || currentTrack.duration)}
              </span>
            </div>
          </div>

          {/* Right: Volume Slider */}
          <div style={{
            width: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.6rem',
          }}>
            <button
              onClick={toggleMute}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              style={{ width: '100px' }}
            />
          </div>
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {showNewPlaylistModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem',
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Create Playlist</h3>
            <form onSubmit={handleCreatePlaylist}>
              <div className="form-group">
                <label className="form-label">Playlist Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Focus Audio"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Brief notes..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Access Visibility</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewPlaylistVisibility('private')}
                    className={`btn ${newPlaylistVisibility === 'private' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.8125rem' }}
                  >
                    <Lock size={14} />
                    <span>Private (Only Me)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPlaylistVisibility('public')}
                    className={`btn ${newPlaylistVisibility === 'public' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.8125rem' }}
                  >
                    <Globe size={14} />
                    <span>Public (Members)</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewPlaylistModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TO PLAYLIST SELECTION MODAL */}
      {trackToAddToPlaylist && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem',
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '380px', padding: '2rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Add Track to Playlist</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              &ldquo;{trackToAddToPlaylist.title}&rdquo;
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
              {playlists.filter((p) => p.isOwner).length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  You don&apos;t have any playlists yet.
                </p>
              ) : (
                playlists.filter((p) => p.isOwner).map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleAddTrackToPlaylist(pl.id)}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'space-between', padding: '0.75rem 1rem' }}
                  >
                    <span>{pl.name}</span>
                    <span className="badge badge-stealth">{pl.trackCount} tracks</span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setTrackToAddToPlaylist(null)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '1.25rem' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
