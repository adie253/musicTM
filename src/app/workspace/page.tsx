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
  MoreVertical,
  MoreHorizontal,
  Maximize2,
  Users,
  X,
  Minimize2,
  MessageSquareQuote,
  FileAudio,
  Radio,
  Infinity,
} from 'lucide-react';
import ExploreMusicView from './ExploreMusicView';

interface CommunityUser {
  id: string;
  username: string;
  displayName: string;
  publicTrackCount: number;
  isSelf: boolean;
  createdAt: number;
}

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
  streamUrl?: string;
  imageUrl?: string;
  isOnlineStream?: boolean;
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

interface UploadQueueItem {
  id: string;
  file: File;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  progress: number;
  bytesUploaded?: number;
  errorMessage?: string;
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
  const [activeTab, setActiveTab] = useState<'listen' | 'explore' | 'tracks' | 'playlists' | 'favorites' | 'upload' | 'profile'>('listen');

  // Data states
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [onlineQueue, setOnlineQueue] = useState<Track[]>([]);
  const [onlineBitrate, setOnlineBitrate] = useState<'96' | '160' | '320'>('96');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [historyIds, setHistoryIds] = useState<Set<string>>(new Set());
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

  // Profile view & privacy filter state
  const [profileActiveTab, setProfileActiveTab] = useState<'tracks' | 'playlists'>('tracks');
  const [profileSongFilter, setProfileSongFilter] = useState<'all' | 'public' | 'private'>('all');
  const [profilePlaylistFilter, setProfilePlaylistFilter] = useState<'all' | 'public' | 'private'>('all');

  // Playlists tab filter
  const [playlistTabFilter, setPlaylistTabFilter] = useState<'all' | 'my' | 'public'>('all');

  // Multi-file upload queue state with individual per-song progress tracking
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [uploadVisibility, setUploadVisibility] = useState<'public' | 'private'>('public');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    currentFileName: string;
    percent: number;
  } | null>(null);
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

  // Community users & 3-dots context menu states
  const [usersList, setUsersList] = useState<CommunityUser[]>([]);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }

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

        await Promise.all([loadTracks(), loadPlaylists(), loadUsers(), loadFavorites()]);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  async function loadUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error('Failed to load users', e);
    }
  }

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

  async function loadFavorites() {
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavoriteTracks(data.tracks || []);
        setFavoriteIds(new Set(data.favoriteIds || []));
      }
    } catch (e) {
      console.error('Failed to load favorites', e);
    }
  }

  async function toggleFavorite(track: Track) {
    if (!track) return;
    const isCurrentlyFav = favoriteIds.has(track.id);

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyFav) {
        next.delete(track.id);
      } else {
        next.add(track.id);
      }
      return next;
    });

    if (currentTrack?.id === track.id) {
      setIsFavorited(!isCurrentlyFav);
    }

    if (isCurrentlyFav) {
      setFavoriteTracks((prev) => prev.filter((t) => t.id !== track.id));
    } else {
      setFavoriteTracks((prev) => [track, ...prev]);
    }

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id,
          trackData: {
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            fileSize: track.fileSize,
            fileName: track.fileName,
            visibility: track.visibility,
            streamUrl: track.streamUrl,
            imageUrl: track.imageUrl,
            isOnlineStream: track.isOnlineStream,
          },
        }),
      });

      if (!res.ok) {
        loadFavorites();
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      loadFavorites();
    }
  }

  // Smart Next-Song Suggestion & Radio generator
  async function handleStartRadio(seedTrack: Track) {
    if (!seedTrack) return;
    setIsBuffering(true);
    playTrack(seedTrack);

    try {
      const res = await fetch(
        `/api/jiosaavn/recommend?title=${encodeURIComponent(seedTrack.title)}&artist=${encodeURIComponent(
          seedTrack.artist
        )}&album=${encodeURIComponent(seedTrack.album || '')}&id=${encodeURIComponent(seedTrack.id)}`
      );
      if (res.ok) {
        const data = await res.json();
        const recs = data.results || [];
        if (recs.length > 0) {
          const mappedRecs: Track[] = recs.map((song: any) => {
            const rawMediaUrl = song.mediaUrls[onlineBitrate] || song.mediaUrls['96'];
            return {
              id: `saavn_${song.id}`,
              title: song.title,
              artist: song.artist,
              album: song.album || 'Smart Radio',
              duration: song.duration,
              fileSize: Math.round(song.duration * 12000),
              visibility: 'public',
              uploaderName: 'Smart Radio',
              createdAt: Date.now(),
              streamUrl: `/api/jiosaavn/stream?url=${encodeURIComponent(rawMediaUrl)}&bitrate=${onlineBitrate}`,
              imageUrl: song.image,
              isOnlineStream: true,
            };
          });

          setOnlineQueue([seedTrack, ...mappedRecs]);
        }
      }
    } catch (e) {
      console.error('Failed to start radio:', e);
    } finally {
      setIsBuffering(false);
    }
  }

  // Autoplay Song Ended handler
  async function handleSongEnded() {
    if (isLooping) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (!currentTrack) return;

    setHistoryIds((prev) => new Set([...prev, currentTrack.id]));

    const pool = currentTrack.isOnlineStream && onlineQueue.length > 0 ? onlineQueue : tracks;
    const currentIndex = pool.findIndex((t) => t.id === currentTrack.id);

    if (currentIndex !== -1 && currentIndex < pool.length - 1) {
      playTrack(pool[currentIndex + 1]);
      return;
    }

    if (isAutoplayEnabled) {
      setIsBuffering(true);
      try {
        const res = await fetch(
          `/api/jiosaavn/recommend?title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(
            currentTrack.artist
          )}&album=${encodeURIComponent(currentTrack.album || '')}&id=${encodeURIComponent(currentTrack.id)}`
        );
        if (res.ok) {
          const data = await res.json();
          const recs = data.results || [];
          if (recs.length > 0) {
            const mappedRecs: Track[] = recs.map((song: any) => {
              const rawMediaUrl = song.mediaUrls[onlineBitrate] || song.mediaUrls['96'];
              return {
                id: `saavn_${song.id}`,
                title: song.title,
                artist: song.artist,
                album: song.album || 'Smart Autoplay',
                duration: song.duration,
                fileSize: Math.round(song.duration * 12000),
                visibility: 'public',
                uploaderName: 'Smart Autoplay',
                createdAt: Date.now(),
                streamUrl: `/api/jiosaavn/stream?url=${encodeURIComponent(rawMediaUrl)}&bitrate=${onlineBitrate}`,
                imageUrl: song.image,
                isOnlineStream: true,
              };
            });

            const freshRecs = mappedRecs.filter((t) => !historyIds.has(t.id));
            const nextBatch = freshRecs.length > 0 ? freshRecs : mappedRecs;

            setOnlineQueue((prev) => [...prev, ...nextBatch]);
            playTrack(nextBatch[0]);
            return;
          }
        }
      } catch (err) {
        console.error('Autoplay recommendation error:', err);
      } finally {
        setIsBuffering(false);
      }
    }

    playNextTrack();
  }

  // Keep isFavorited in sync
  useEffect(() => {
    if (currentTrack) {
      setIsFavorited(favoriteIds.has(currentTrack.id));
    }
  }, [currentTrack, favoriteIds]);

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
          {
            src: currentTrack.imageUrl
              ? `/api/jiosaavn/image?url=${encodeURIComponent(currentTrack.imageUrl)}`
              : '/icons/icon.svg',
            sizes: '512x512',
            type: currentTrack.imageUrl ? 'image/jpeg' : 'image/svg+xml',
          },
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

  // Synchronize audio element volume reactively
  useEffect(() => {
    if (audioRef.current) {
      try {
        audioRef.current.volume = isMuted ? 0 : volume;
      } catch (err) {
        console.warn('Volume set error:', err);
      }
    }
  }, [volume, isMuted]);

  // Audio Playback
  function playTrack(track: Track) {
    setPlaybackError(null);

    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        if (audioRef.current) {
          audioRef.current.volume = isMuted ? 0 : volume;
        }
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
      audioRef.current.src = track.streamUrl || `/api/tracks/${track.id}/stream`;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.load();
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current
        .play()
        .then(() => {
          if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
          }
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
      audioRef.current.volume = isMuted ? 0 : volume;
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
    const newVol = Math.max(0, Math.min(1, parseFloat(e.target.value)));
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  }

  function toggleMute() {
    if (!audioRef.current) return;
    if (isMuted) {
      const targetVol = volume > 0 ? volume : 0.8;
      setVolume(targetVol);
      audioRef.current.volume = targetVol;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }

  function playNextTrack(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!currentTrack) return;
    const pool = currentTrack.isOnlineStream && onlineQueue.length > 0 ? onlineQueue : tracks;
    if (pool.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      playTrack(pool[randomIndex]);
      return;
    }
    const currentIndex = pool.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % pool.length;
    playTrack(pool[nextIndex]);
  }

  function playPrevTrack(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!currentTrack) return;
    const pool = currentTrack.isOnlineStream && onlineQueue.length > 0 ? onlineQueue : tracks;
    if (pool.length === 0) return;
    const currentIndex = pool.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + pool.length) % pool.length;
    playTrack(pool[prevIndex]);
  }

  // Batch Multi-File Upload handler with per-song progress tracking via XMLHttpRequest
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const itemsToUpload = uploadQueue.filter((item) => item.status !== 'completed');
    if (itemsToUpload.length === 0) return;

    setUploading(true);
    setUploadStatus(null);

    let successCount = 0;
    let failCount = 0;
    const total = itemsToUpload.length;

    for (let i = 0; i < total; i++) {
      const currentItem = itemsToUpload[i];

      // Mark current track as uploading
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === currentItem.id ? { ...item, status: 'uploading', progress: 0, errorMessage: undefined } : item
        )
      );

      setUploadProgress({
        current: i + 1,
        total,
        currentFileName: currentItem.file.name,
        percent: Math.round((i / total) * 100),
      });

      // Stream upload via XMLHttpRequest to get accurate, real-time byte progress per song
      const uploadResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', currentItem.file);
        formData.append('visibility', uploadVisibility);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === currentItem.id
                  ? { ...item, progress: percent, bytesUploaded: event.loaded }
                  : item
              )
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ success: true });
          } else {
            let errorMsg = `Upload failed (${xhr.status})`;
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.error) errorMsg = res.error;
            } catch {
              // fallback
            }
            resolve({ success: false, error: errorMsg });
          }
        };

        xhr.onerror = () => {
          resolve({ success: false, error: 'Network connection error' });
        };

        xhr.ontimeout = () => {
          resolve({ success: false, error: 'Upload request timed out' });
        };

        xhr.open('POST', '/api/tracks/upload');
        xhr.send(formData);
      });

      if (uploadResult.success) {
        successCount++;
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? { ...item, status: 'completed', progress: 100, bytesUploaded: currentItem.file.size }
              : item
          )
        );
      } else {
        failCount++;
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? { ...item, status: 'error', errorMessage: uploadResult.error || 'Upload failed' }
              : item
          )
        );
      }

      setUploadProgress({
        current: i + 1,
        total,
        currentFileName: currentItem.file.name,
        percent: Math.round(((i + 1) / total) * 100),
      });
    }

    setUploading(false);
    setUploadProgress(null);

    if (successCount > 0) {
      await loadTracks();
      setUploadStatus({
        type: 'success',
        message: `Successfully added ${successCount} track${successCount > 1 ? 's' : ''} to your Vault!${failCount > 0 ? ` (${failCount} failed)` : ''}`,
      });
      if (failCount === 0) {
        setTimeout(() => {
          setUploadQueue([]);
          setActiveTab('tracks');
        }, 1200);
      }
    } else {
      setUploadStatus({
        type: 'error',
        message: 'Upload failed. Please ensure audio files are valid MP3, WAV, FLAC, M4A or AAC formats under 4.5MB.',
      });
    }
  }

  function handleFilesAdded(files: FileList | null) {
    if (!files || files.length === 0) return;
    const valid = Array.from(files).filter((f) => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      return ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext) || f.type.startsWith('audio/');
    });
    setUploadQueue((prev) => {
      const existing = new Set(prev.map((item) => `${item.file.name}-${item.file.size}`));
      const newItems: UploadQueueItem[] = valid
        .filter((f) => !existing.has(`${f.name}-${f.size}`))
        .map((f, idx) => ({
          id: `${f.name}-${f.size}-${Date.now()}-${idx}`,
          file: f,
          status: 'idle',
          progress: 0,
        }));
      return [...prev, ...newItems];
    });
  }

  function removeUploadItem(id: string) {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
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

  // Toggle playlist visibility (Public <-> Private)
  async function togglePlaylistVisibility(playlistId: string, currentVis: 'public' | 'private') {
    const newVis = currentVis === 'public' ? 'private' : 'public';
    // Optimistic update
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, visibility: newVis } : p))
    );
    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist((prev) => (prev ? { ...prev, visibility: newVis } : null));
    }

    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVis }),
      });
      if (!res.ok) {
        // Rollback
        setPlaylists((prev) =>
          prev.map((p) => (p.id === playlistId ? { ...p, visibility: currentVis } : p))
        );
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist((prev) => (prev ? { ...prev, visibility: currentVis } : null));
        }
        showToast('Failed to update playlist visibility');
      } else {
        showToast(`Playlist privacy updated to ${newVis.toUpperCase()}`);
      }
    } catch (err) {
      console.error('Failed to toggle playlist visibility:', err);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...p, visibility: currentVis } : p))
      );
      if (selectedPlaylist && selectedPlaylist.id === playlistId) {
        setSelectedPlaylist((prev) => (prev ? { ...prev, visibility: currentVis } : null));
      }
      showToast('Error updating playlist visibility');
    }
  }

  async function handleDeletePlaylist(playlistId: string) {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist(null);
        }
        await loadPlaylists();
        showToast('Playlist deleted');
      }
    } catch (err) {
      console.error('Delete playlist error:', err);
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

  const matchingSongs = tracks.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesUser = selectedUserFilter
      ? t.uploaderName?.toLowerCase() === selectedUserFilter.toLowerCase()
      : true;
    const matchesQuery = !q
      ? true
      : t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album && t.album.toLowerCase().includes(q)) ||
        (t.uploaderName && t.uploaderName.toLowerCase().includes(q)) ||
        (t.uploaderDisplayName && t.uploaderDisplayName.toLowerCase().includes(q));
    return matchesUser && matchesQuery;
  });

  const matchingUsers = usersList.filter((u) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  });

  const filteredTracks = matchingSongs;
  const myUploadedTracks = tracks.filter((t) => t.isOwner);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff' }}>
      {/* Audio Element with Full Event Bindings & Volume Enforcement */}
      <audio
        ref={audioRef}
        loop={isLooping}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => {
          setIsBuffering(false);
          if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
          }
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
          if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
          }
        }}
        onEnded={() => {
          handleSongEnded();
        }}
        onError={() => {
          setIsBuffering(false);
          setIsPlaying(false);
          setPlaybackError(
            'Unable to stream this audio track. If this file was uploaded before the cloud storage upgrade, please re-upload it.'
          );
        }}
        onLoadedMetadata={() => {
          handleTimeUpdate();
          if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
          }
        }}
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
            placeholder="Search songs & users"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedUserFilter) setSelectedUserFilter(null);
            }}
            style={{ paddingRight: (searchQuery || selectedUserFilter) ? '2.2rem' : '1rem' }}
          />
          {(searchQuery || selectedUserFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedUserFilter(null);
              }}
              title="Clear search"
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          )}
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
              onClick={() => setActiveTab('explore')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'explore' ? 'rgba(250, 36, 60, 0.15)' : 'transparent',
                color: activeTab === 'explore' ? 'var(--apple-pink)' : 'var(--text-white)',
                border: 'none',
                fontWeight: activeTab === 'explore' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Radio size={18} />
              <span>Explore Indian Music</span>
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
              onClick={() => setActiveTab('favorites')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'favorites' ? 'rgba(250, 36, 60, 0.15)' : 'transparent',
                color: activeTab === 'favorites' ? 'var(--apple-pink)' : 'var(--text-white)',
                border: 'none',
                fontWeight: activeTab === 'favorites' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Heart size={18} fill={activeTab === 'favorites' ? 'var(--apple-pink)' : 'none'} />
              <span>Favorites ({favoriteTracks.length})</span>
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

            <button
              onClick={() => setActiveTab('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'profile' ? 'rgba(250, 36, 60, 0.15)' : 'transparent',
                color: activeTab === 'profile' ? 'var(--apple-pink)' : 'var(--text-white)',
                border: 'none',
                fontWeight: activeTab === 'profile' ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <User size={18} />
              <span>My Profile & Vault</span>
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

        {/* User Profile Card (Fixed cleanly at sidebar bottom - opens Profile Page) */}
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div
            onClick={() => setActiveTab('profile')}
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
              <div style={{ fontSize: '0.6875rem', color: activeTab === 'profile' ? 'var(--apple-pink)' : 'var(--text-secondary)', fontWeight: 500 }}>
                Manage Profile & Vault
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
              onClick={() => setActiveTab('profile')}
              title="My Profile"
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
              placeholder="Search songs & users"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedUserFilter) setSelectedUserFilter(null);
              }}
              style={{ borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', paddingRight: (searchQuery || selectedUserFilter) ? '2.2rem' : '1rem' }}
            />
            {(searchQuery || selectedUserFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedUserFilter(null);
                }}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                ✕
              </button>
            )}
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
          {searchQuery.trim().length > 0 || selectedUserFilter ? (
            <div>
              {/* Search Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
                    {selectedUserFilter ? `Songs by @${selectedUserFilter}` : `Search Results`}
                  </h1>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                    {matchingSongs.length} song{matchingSongs.length === 1 ? '' : 's'}
                    {matchingUsers.length > 0 ? ` • ${matchingUsers.length} community member${matchingUsers.length === 1 ? '' : 's'}` : ''}
                    {selectedUserFilter ? ` (Filtering by @${selectedUserFilter})` : ` matching "${searchQuery}"`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {searchQuery.trim().length > 0 && (
                    <button
                      onClick={() => {
                        setActiveTab('explore');
                      }}
                      className="btn-apple-primary"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      <Globe size={14} />
                      <span>Search 80M+ Online Catalog</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedUserFilter(null);
                    }}
                    className="btn-apple-secondary"
                    style={{ fontSize: '0.8125rem' }}
                  >
                    ✕ Clear Search
                  </button>
                </div>
              </div>

              {/* SECTION 1: COMMUNITY MEMBERS / USERS */}
              {matchingUsers.length > 0 && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Users size={18} color="var(--apple-pink)" />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                      People & Artists ({matchingUsers.length})
                    </h2>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '1rem',
                  }}>
                    {matchingUsers.map((u) => (
                      <div
                        key={u.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
                          <div style={{
                            width: '2.85rem',
                            height: '2.85rem',
                            borderRadius: '50%',
                            background: 'var(--apple-gradient)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1rem',
                            color: '#ffffff',
                            flexShrink: 0,
                            boxShadow: '0 4px 14px var(--apple-pink-glow)',
                          }}>
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.925rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.displayName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              @{u.username} • {u.publicTrackCount} public song{u.publicTrackCount === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedUserFilter(u.username);
                            setSearchQuery('');
                          }}
                          className="btn-apple-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', flexShrink: 0 }}
                        >
                          View Songs
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: SONGS */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Music size={18} color="var(--apple-pink)" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Songs ({matchingSongs.length})
                  </h2>
                </div>

                {matchingSongs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-lg)' }}>
                    <Music size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Songs Found</h3>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                      Try searching with a different keyword or check other community members.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {matchingSongs.map((track) => {
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
                          <div style={{
                            width: '2.85rem',
                            height: '2.85rem',
                            borderRadius: '0.55rem',
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
                            <div style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {track.artist} • By @{track.uploaderName || 'Vault'}
                            </div>
                          </div>

                          {track.isOwner && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '999px',
                              background: track.visibility === 'public' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                              color: track.visibility === 'public' ? 'var(--apple-green)' : 'var(--text-secondary)',
                            }}>
                              {track.visibility.toUpperCase()}
                            </span>
                          )}

                          <span style={{ fontSize: '0.78125rem', color: 'var(--text-tertiary)' }}>
                            {formatTime(track.duration)}
                          </span>

                          {/* 3-DOTS OPTIONS BUTTON */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuTrack(track);
                            }}
                            title="More Options"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              padding: '0.45rem',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '0.25rem',
                            }}
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* TAB: EXPLORE ONLINE INDIAN MUSIC (FIREWALL-PROOF STREAMING) */}
              {activeTab === 'explore' && (
                <ExploreMusicView
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  isBuffering={isBuffering}
                  onPlayTrack={playTrack}
                  onAddToPlaylist={(trk) => setMenuTrack(trk)}
                  onUpdateOnlineQueue={(queue) => setOnlineQueue(queue)}
                  activeBitrate={onlineBitrate}
                  onChangeBitrate={(br) => setOnlineBitrate(br)}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={toggleFavorite}
                  onStartRadio={handleStartRadio}
                />
              )}

              {/* TAB: FAVORITES / LIKED SONGS */}
              {activeTab === 'favorites' && (
                <div>
                  <div
                    style={{
                      borderRadius: 'var(--radius-xl)',
                      background: 'linear-gradient(135deg, #2a0818 0%, #4a0e28 50%, #fa243c 100%)',
                      padding: '2.5rem 2rem',
                      position: 'relative',
                      overflow: 'hidden',
                      marginBottom: '2rem',
                      boxShadow: '0 16px 40px rgba(250, 36, 60, 0.25)',
                    }}
                  >
                    <div style={{ maxWidth: '520px', position: 'relative', zIndex: 2 }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.35rem 0.85rem',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '1rem',
                        }}
                      >
                        <Heart size={14} fill="#ffffff" />
                        <span>Your Curated Vault</span>
                      </div>

                      <h1
                        style={{
                          fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                          fontWeight: 800,
                          marginBottom: '0.5rem',
                          color: '#ffffff',
                        }}
                      >
                        Favorite Songs
                      </h1>

                      <p
                        style={{
                          fontSize: '0.95rem',
                          color: 'rgba(255, 255, 255, 0.82)',
                          marginBottom: '1.5rem',
                          lineHeight: 1.5,
                        }}
                      >
                        {favoriteTracks.length} {favoriteTracks.length === 1 ? 'song' : 'songs'} you love. Play your collection anytime with 1-click.
                      </p>

                      {favoriteTracks.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button
                            onClick={() => {
                              if (favoriteTracks.length > 0) {
                                setOnlineQueue(favoriteTracks);
                                playTrack(favoriteTracks[0]);
                              }
                            }}
                            className="btn-apple-primary"
                          >
                            <Play size={16} fill="currentColor" />
                            <span>Play All</span>
                          </button>

                          <button
                            onClick={() => {
                              if (favoriteTracks.length > 0) {
                                setOnlineQueue(favoriteTracks);
                                const randomIdx = Math.floor(Math.random() * favoriteTracks.length);
                                playTrack(favoriteTracks[randomIdx]);
                              }
                            }}
                            className="btn-apple-secondary"
                          >
                            <Shuffle size={16} />
                            <span>Shuffle</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {favoriteTracks.length === 0 ? (
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
                      <div
                        style={{
                          width: '4rem',
                          height: '4rem',
                          borderRadius: '50%',
                          background: 'rgba(250, 36, 60, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Heart size={32} color="var(--apple-pink)" />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>No Favorite Songs Yet</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px' }}>
                        Tap the heart icon on any song in Community or Explore to save it to your favorites.
                      </div>
                      <button onClick={() => setActiveTab('explore')} className="btn-apple-primary" style={{ marginTop: '0.5rem' }}>
                        Explore Songs
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {favoriteTracks.map((trk, idx) => {
                        const isTrackActive = currentTrack?.id === trk.id;
                        const isTrackPlaying = isTrackActive && isPlaying;
                        return (
                          <div
                            key={trk.id}
                            onClick={() => {
                              setOnlineQueue(favoriteTracks);
                              playTrack(trk);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0.75rem 1rem',
                              borderRadius: 'var(--radius-md)',
                              background: isTrackActive ? 'rgba(250, 36, 60, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                              border: isTrackActive ? '1px solid rgba(250, 36, 60, 0.4)' : '1px solid transparent',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                              gap: '1rem',
                            }}
                            onMouseEnter={(e) => {
                              if (!isTrackActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isTrackActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            }}
                          >
                            <div style={{ width: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: isTrackActive ? 'var(--apple-pink)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                              {isTrackPlaying ? '▶' : idx + 1}
                            </div>

                            <div
                              style={{
                                width: '2.75rem',
                                height: '2.75rem',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'hidden',
                                background: trk.imageUrl ? 'none' : getTrackGradient(trk.id),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {trk.imageUrl ? (
                                <img
                                  src={`/api/jiosaavn/image?url=${encodeURIComponent(trk.imageUrl)}`}
                                  alt={trk.title}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Music size={18} fill="#ffffff" color="#ffffff" />
                              )}
                            </div>

                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: '0.925rem',
                                  color: isTrackActive ? 'var(--apple-pink)' : '#ffffff',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {trk.title}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--text-secondary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {trk.artist} {trk.album ? `• ${trk.album}` : ''}
                              </div>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                              {formatTime(trk.duration)}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(trk);
                              }}
                              title="Remove from favorites"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--apple-pink)',
                                padding: '0.4rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Heart size={18} fill="var(--apple-pink)" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

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

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuTrack(track);
                            }}
                            title="Song Options"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              padding: '0.35rem',
                              cursor: 'pointer',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
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
                    onClick={() => setActiveTab('profile')}
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

                        {/* 3-DOTS MORE OPTIONS */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuTrack(track);
                          }}
                          title="Song Options"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            padding: '0.45rem',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '0.25rem',
                          }}
                        >
                          <MoreVertical size={18} />
                        </button>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--apple-pink)' }}>
                          PLAYLIST
                        </span>
                        {selectedPlaylist.isOwner ? (
                          <button
                            type="button"
                            onClick={() => togglePlaylistVisibility(selectedPlaylist.id, selectedPlaylist.visibility)}
                            title={`Click to switch playlist privacy to ${selectedPlaylist.visibility === 'public' ? 'PRIVATE' : 'PUBLIC'}`}
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.65rem',
                              borderRadius: '999px',
                              background: selectedPlaylist.visibility === 'public' ? 'rgba(48, 209, 88, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                              color: selectedPlaylist.visibility === 'public' ? 'var(--apple-green)' : 'var(--text-secondary)',
                              border: `1px solid ${selectedPlaylist.visibility === 'public' ? 'rgba(48, 209, 88, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {selectedPlaylist.visibility === 'public' ? <Globe size={13} /> : <Lock size={13} />}
                            <span>{selectedPlaylist.visibility.toUpperCase()}</span>
                            <span style={{ opacity: 0.7, fontSize: '0.62rem' }}>(Click to Toggle)</span>
                          </button>
                        ) : (
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
                        )}
                      </div>
                      <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
                        {selectedPlaylist.name}
                      </h1>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.85rem' }}>
                        {selectedPlaylist.description || `Created by ${selectedPlaylist.creatorName || 'You'}`} • {playlistTracks.length} Songs
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
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
                        {selectedPlaylist.isOwner && (
                          <button
                            type="button"
                            onClick={() => togglePlaylistVisibility(selectedPlaylist.id, selectedPlaylist.visibility)}
                            className="btn-apple-secondary"
                            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#ffffff' }}
                            title={`Make playlist ${selectedPlaylist.visibility === 'public' ? 'Private' : 'Public'}`}
                          >
                            {selectedPlaylist.visibility === 'public' ? <Lock size={15} /> : <Globe size={15} />}
                            <span>Make {selectedPlaylist.visibility === 'public' ? 'Private' : 'Public'}</span>
                          </button>
                        )}
                        {selectedPlaylist.isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                            className="btn-apple-secondary"
                            style={{ padding: '0.55rem 0.85rem', color: '#ff453a' }}
                            title="Delete Playlist"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
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

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuTrack(pt);
                            }}
                            title="Song Options"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              padding: '0.35rem',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '0.4rem',
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
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

                  {/* Playlists Filter Tabs */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setPlaylistTabFilter('all')}
                      style={{
                        background: playlistTabFilter === 'all' ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.06)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      All ({playlists.length})
                    </button>
                    <button
                      onClick={() => setPlaylistTabFilter('my')}
                      style={{
                        background: playlistTabFilter === 'my' ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.06)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      My Playlists ({playlists.filter((p) => p.isOwner).length})
                    </button>
                    <button
                      onClick={() => setPlaylistTabFilter('public')}
                      style={{
                        background: playlistTabFilter === 'public' ? 'var(--apple-green)' : 'rgba(255, 255, 255, 0.06)',
                        color: playlistTabFilter === 'public' ? '#000000' : '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Community Public ({playlists.filter((p) => !p.isOwner && p.visibility === 'public').length})
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
                    (() => {
                      const displayedPlaylists = playlists.filter((pl) => {
                        if (playlistTabFilter === 'my') return pl.isOwner;
                        if (playlistTabFilter === 'public') return !pl.isOwner && pl.visibility === 'public';
                        return true;
                      });

                      if (displayedPlaylists.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-tertiary)' }}>
                            <FolderLock size={44} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.4rem' }}>
                              No playlists found
                            </div>
                            <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                              Create a new public or private playlist to organize your favorite music.
                            </p>
                            <button
                              onClick={() => setShowNewPlaylistModal(true)}
                              className="btn-apple-primary"
                              style={{ margin: '0 auto' }}
                            >
                              <Plus size={16} />
                              <span>Create Playlist</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1.25rem' }}>
                          {displayedPlaylists.map((pl) => (
                            <div
                              key={pl.id}
                              onClick={() => handleViewPlaylist(pl)}
                              style={{
                                cursor: 'pointer',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '0.85rem',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <div style={{
                                width: '100%',
                                aspectRatio: '1 / 1',
                                borderRadius: 'var(--radius-md)',
                                background: getTrackGradient(pl.id),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '0.75rem',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                              }}>
                                <FolderLock size={44} color="#ffffff" />
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.35rem' }}>
                                {pl.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                  {pl.trackCount} Song{pl.trackCount === 1 ? '' : 's'}
                                </span>
                                {pl.isOwner ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePlaylistVisibility(pl.id, pl.visibility);
                                    }}
                                    title={`Click to switch to ${pl.visibility === 'public' ? 'Private' : 'Public'}`}
                                    style={{
                                      background: pl.visibility === 'public' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                      color: pl.visibility === 'public' ? 'var(--apple-green)' : 'var(--text-secondary)',
                                      border: `1px solid ${pl.visibility === 'public' ? 'rgba(48, 209, 88, 0.35)' : 'rgba(255, 255, 255, 0.12)'}`,
                                      borderRadius: '999px',
                                      padding: '0.15rem 0.5rem',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {pl.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                                    <span>{pl.visibility.toUpperCase()}</span>
                                  </button>
                                ) : (
                                  <span
                                    style={{
                                      background: 'rgba(48, 209, 88, 0.12)',
                                      color: 'var(--apple-green)',
                                      borderRadius: '999px',
                                      padding: '0.15rem 0.45rem',
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    PUBLIC
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADD MUSIC (MULTI-TRACK BATCH UPLOAD WITH SEQUENTIAL STREAMING) */}
          {activeTab === 'upload' && (
            <div style={{ maxWidth: '620px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  Add to Music Vault
                </h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Upload multiple audio tracks at once — persistent cloud storage with automatic metadata extraction.
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

              {/* Upload Progress Indicator during batch uploading */}
              {uploading && uploadProgress && (
                <div style={{
                  background: 'rgba(28, 28, 32, 0.9)',
                  border: '1px solid rgba(250, 36, 60, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 size={16} className="animate-spin" color="var(--apple-pink)" />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Uploading Track {uploadProgress.current} of {uploadProgress.total}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--apple-pink)', fontWeight: 700 }}>
                      {uploadProgress.percent}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    &ldquo;{uploadProgress.currentFileName}&rdquo;
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${uploadProgress.percent}%`,
                      background: 'var(--apple-gradient)',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )}

              <form onSubmit={handleUpload}>
                {/* Drag and Drop / Multi-file Picker Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFilesAdded(e.dataTransfer.files);
                  }}
                  style={{
                    border: '2px dashed rgba(255, 255, 255, 0.18)',
                    borderRadius: 'var(--radius-xl)',
                    padding: uploadQueue.length > 0 ? '1.5rem 1.25rem' : '3rem 1.5rem',
                    textAlign: 'center',
                    background: 'rgba(28, 28, 30, 0.45)',
                    marginBottom: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="file"
                    id="audio-upload-multiple"
                    accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
                    multiple
                    disabled={uploading}
                    onChange={(e) => {
                      handleFilesAdded(e.target.files);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="audio-upload-multiple" style={{ cursor: uploading ? 'not-allowed' : 'pointer', display: 'block' }}>
                    <div style={{
                      width: '3.75rem',
                      height: '3.75rem',
                      borderRadius: '50%',
                      background: 'rgba(250, 36, 60, 0.15)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--apple-pink)',
                      marginBottom: '0.85rem',
                    }}>
                      <Upload size={26} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                      {uploadQueue.length === 0 ? 'Choose Multiple Audio Files or Drop Here' : 'Add More Audio Files'}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                      Supports MP3, WAV, FLAC, M4A, AAC • Select multiple tracks at once
                    </p>
                  </label>
                </div>

                {/* Selected Files Batch Queue List with Individual Per-Song Progress */}
                {uploadQueue.length > 0 && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Music size={16} color="var(--apple-pink)" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                          Upload Queue ({uploadQueue.length} Tracks)
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                          • {(uploadQueue.reduce((acc, item) => acc + item.file.size, 0) / (1024 * 1024)).toFixed(1)} MB total
                        </span>
                      </div>

                      {!uploading && (
                        <button
                          type="button"
                          onClick={() => setUploadQueue([])}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b81')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.55rem', paddingRight: '0.2rem' }}>
                      {uploadQueue.map((item) => {
                        const isThisUploading = item.status === 'uploading';
                        const isCompleted = item.status === 'completed';
                        const isError = item.status === 'error';
                        const isIdle = item.status === 'idle';

                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                              padding: '0.75rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              background: isThisUploading
                                ? 'rgba(250, 36, 60, 0.08)'
                                : isCompleted
                                ? 'rgba(48, 209, 88, 0.08)'
                                : isError
                                ? 'rgba(255, 69, 58, 0.08)'
                                : 'rgba(255, 255, 255, 0.04)',
                              border: isThisUploading
                                ? '1px solid rgba(250, 36, 60, 0.35)'
                                : isCompleted
                                ? '1px solid rgba(48, 209, 88, 0.3)'
                                : isError
                                ? '1px solid rgba(255, 69, 58, 0.3)'
                                : '1px solid rgba(255, 255, 255, 0.06)',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                              {/* Left: Status icon & Track metadata */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                                {isThisUploading && (
                                  <Loader2 size={17} className="animate-spin" color="var(--apple-pink)" style={{ flexShrink: 0 }} />
                                )}
                                {isCompleted && (
                                  <CheckCircle2 size={17} color="#30d158" style={{ flexShrink: 0 }} />
                                )}
                                {isError && (
                                  <AlertCircle size={17} color="#ff453a" style={{ flexShrink: 0 }} />
                                )}
                                {isIdle && (
                                  <FileAudio size={17} color="var(--apple-pink)" style={{ flexShrink: 0 }} />
                                )}

                                <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span
                                    style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      fontWeight: 600,
                                      fontSize: '0.84rem',
                                      color: '#ffffff',
                                    }}
                                    title={item.file.name}
                                  >
                                    {item.file.name}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: isError ? '#ff8080' : isCompleted ? '#30d158' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                    {isThisUploading && (
                                      <>Streaming {item.progress}% • {((item.bytesUploaded || 0) / (1024 * 1024)).toFixed(1)} / {(item.file.size / (1024 * 1024)).toFixed(1)} MB</>
                                    )}
                                    {isCompleted && (
                                      <>Uploaded successfully • {(item.file.size / (1024 * 1024)).toFixed(1)} MB</>
                                    )}
                                    {isError && (
                                      <>{item.errorMessage || 'Failed to process audio'}</>
                                    )}
                                    {isIdle && (
                                      <>Queued • {(item.file.size / (1024 * 1024)).toFixed(1)} MB</>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Status Pill Badge or Remove Button */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                                {isThisUploading && (
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      color: '#ffffff',
                                      background: 'var(--apple-pink)',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '999px',
                                      boxShadow: '0 2px 8px rgba(250, 36, 60, 0.4)',
                                    }}
                                  >
                                    {item.progress}%
                                  </span>
                                )}

                                {isCompleted && (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      color: '#30d158',
                                      background: 'rgba(48, 209, 88, 0.15)',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '999px',
                                      border: '1px solid rgba(48, 209, 88, 0.3)',
                                    }}
                                  >
                                    Done
                                  </span>
                                )}

                                {isError && (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      color: '#ff453a',
                                      background: 'rgba(255, 69, 58, 0.15)',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '999px',
                                      border: '1px solid rgba(255, 69, 58, 0.3)',
                                    }}
                                  >
                                    Failed
                                  </span>
                                )}

                                {isIdle && !uploading && (
                                  <button
                                    type="button"
                                    onClick={() => removeUploadItem(item.id)}
                                    title="Remove track"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-tertiary)',
                                      cursor: 'pointer',
                                      padding: '0.2rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b81')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                                  >
                                    <X size={15} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Individual Song Progress Bar */}
                            <div
                              style={{
                                height: '4px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                borderRadius: '999px',
                                overflow: 'hidden',
                                width: '100%',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${item.status === 'completed' ? 100 : item.status === 'error' ? 100 : item.progress}%`,
                                  background:
                                    item.status === 'completed'
                                      ? '#30d158'
                                      : item.status === 'error'
                                      ? '#ff453a'
                                      : 'var(--apple-gradient)',
                                  borderRadius: '999px',
                                  transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Default Visibility Selector for the batch */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Batch Visibility Setting
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setUploadVisibility('public')}
                      className={`btn-apple-secondary ${uploadVisibility === 'public' ? 'btn-apple-primary' : ''}`}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 600,
                        border: uploadVisibility === 'public' ? '1px solid rgba(250, 36, 60, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Globe size={15} color="#ffffff" />
                      <span style={{ color: '#ffffff' }}>Public (Everyone Can Listen)</span>
                    </button>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setUploadVisibility('private')}
                      className={`btn-apple-secondary ${uploadVisibility === 'private' ? 'btn-apple-primary' : ''}`}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 600,
                        border: uploadVisibility === 'private' ? '1px solid rgba(250, 36, 60, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Lock size={15} color="#ffffff" />
                      <span style={{ color: '#ffffff' }}>Private (Only Me)</span>
                    </button>
                  </div>
                </div>

                {/* Upload Button */}
                {(() => {
                  const pendingCount = uploadQueue.filter((item) => item.status !== 'completed').length;
                  const isFinished = uploadQueue.length > 0 && pendingCount === 0;

                  return (
                    <button
                      type="submit"
                      className="btn-apple-primary"
                      disabled={uploadQueue.length === 0 || pendingCount === 0 || uploading}
                      style={{
                        width: '100%',
                        padding: '0.95rem',
                        fontSize: '1rem',
                        fontWeight: 700,
                        justifyContent: 'center',
                        color: '#ffffff',
                        opacity: uploadQueue.length === 0 || (isFinished && !uploading) ? 0.7 : 1,
                        cursor: uploadQueue.length === 0 || isFinished || uploading ? 'not-allowed' : 'pointer',
                        boxShadow: uploadQueue.length > 0 && !isFinished ? '0 6px 24px var(--apple-pink-glow)' : 'none',
                      }}
                    >
                      {uploading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
                          <Loader2 size={18} className="animate-spin" color="#ffffff" />
                          <span style={{ color: '#ffffff', fontWeight: 700 }}>
                            Uploading Track {uploadProgress?.current || 1} of {uploadProgress?.total || uploadQueue.length}...
                          </span>
                        </div>
                      ) : isFinished ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
                          <CheckCircle2 size={18} color="#30d158" />
                          <span style={{ color: '#ffffff', fontWeight: 700 }}>All Tracks Successfully Uploaded!</span>
                        </div>
                      ) : (
                        <span style={{ color: '#ffffff', fontWeight: 700 }}>
                          Upload {pendingCount > 0 ? `${pendingCount} ` : ''}Song{pendingCount === 1 ? '' : 's'} to Vault
                        </span>
                      )}
                    </button>
                  );
                })()}
              </form>
            </div>
          )}

          {/* TAB 5: PROFILE & PRIVACY MANAGER (DEDICATED FULL PAGE) */}
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '920px', margin: '0 auto' }}>
              {/* Profile Hero Header Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 20, 28, 0.7) 0%, rgba(18, 18, 22, 0.95) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '2rem 2.25rem',
                  marginBottom: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div
                    style={{
                      width: '4.8rem',
                      height: '4.8rem',
                      borderRadius: '50%',
                      background: 'var(--apple-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px var(--apple-pink-glow)',
                      flexShrink: 0,
                    }}
                  >
                    <User size={34} color="#ffffff" />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                      <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                        {user?.displayName || user?.username}
                      </h1>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: 'rgba(250, 36, 60, 0.2)',
                          color: 'var(--apple-pink)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(250, 36, 60, 0.3)',
                        }}
                      >
                        VAULT PRO
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      @{user?.username} • {user?.email}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      Connected to Turso Cloud Distributed Database
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="btn-apple-primary"
                    style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem' }}
                  >
                    <Upload size={16} />
                    <span>Upload Songs</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="btn-apple-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem' }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Vault Statistics 5-Card Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem',
                }}
              >
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                    Total Tracks
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>{myUploadedTracks.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    In your vault
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(48, 209, 88, 0.08)',
                    border: '1px solid rgba(48, 209, 88, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--apple-green)', marginBottom: '0.5rem' }}>
                    Public Tracks
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--apple-green)' }}>
                    {myUploadedTracks.filter((t) => t.visibility === 'public').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(48, 209, 88, 0.8)', marginTop: '0.25rem' }}>
                    Playable by all
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(250, 36, 60, 0.08)',
                    border: '1px solid rgba(250, 36, 60, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--apple-pink)', marginBottom: '0.5rem' }}>
                    Private Tracks
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--apple-pink)' }}>
                    {myUploadedTracks.filter((t) => t.visibility === 'private').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(250, 36, 60, 0.8)', marginTop: '0.25rem' }}>
                    Only you
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                    My Playlists
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                    {playlists.filter((p) => p.isOwner).length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {playlists.filter((p) => p.isOwner && p.visibility === 'public').length} Public • {playlists.filter((p) => p.isOwner && p.visibility === 'private').length} Private
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                    Storage
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                    {(myUploadedTracks.reduce((sum, t) => sum + (t.fileSize || 0), 0) / (1024 * 1024)).toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>MB</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Turso BLOBs
                  </div>
                </div>
              </div>

              {/* Privacy Manager Section with Tracks & Playlists switcher */}
              <div
                style={{
                  background: 'rgba(20, 20, 24, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.75rem',
                }}
              >
                {/* Main Type Tabs: Tracks Privacy vs Playlists Privacy */}
                <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setProfileActiveTab('tracks')}
                    style={{
                      background: profileActiveTab === 'tracks' ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Music size={16} />
                    <span>Tracks Privacy ({myUploadedTracks.length})</span>
                  </button>
                  <button
                    onClick={() => setProfileActiveTab('playlists')}
                    style={{
                      background: profileActiveTab === 'playlists' ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <FolderLock size={16} />
                    <span>Playlists Privacy ({playlists.filter((p) => p.isOwner).length})</span>
                  </button>
                </div>

                {profileActiveTab === 'tracks' ? (
                  /* TRACKS PRIVACY MANAGER */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                          Track Privacy & Visibility
                        </h2>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          Click on any badge below to instantly switch track visibility between Public and Private.
                        </p>
                      </div>

                      {/* Filter tabs */}
                      <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.25rem', borderRadius: 'var(--radius-full)' }}>
                        <button
                          onClick={() => setProfileSongFilter('all')}
                          style={{
                            background: profileSongFilter === 'all' ? 'var(--apple-pink)' : 'transparent',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          All ({myUploadedTracks.length})
                        </button>
                        <button
                          onClick={() => setProfileSongFilter('public')}
                          style={{
                            background: profileSongFilter === 'public' ? 'var(--apple-green)' : 'transparent',
                            color: profileSongFilter === 'public' ? '#000000' : '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Public ({myUploadedTracks.filter((t) => t.visibility === 'public').length})
                        </button>
                        <button
                          onClick={() => setProfileSongFilter('private')}
                          style={{
                            background: profileSongFilter === 'private' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Private ({myUploadedTracks.filter((t) => t.visibility === 'private').length})
                        </button>
                      </div>
                    </div>

                    {/* Track Rows */}
                    {myUploadedTracks.filter((t) =>
                      profileSongFilter === 'all' ? true : t.visibility === profileSongFilter
                    ).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-tertiary)' }}>
                        <Music size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
                          No songs found in this category
                        </div>
                        <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                          Add music to your Vault to listen anywhere and share with community listeners.
                        </p>
                        <button
                          onClick={() => setActiveTab('upload')}
                          className="btn-apple-primary"
                          style={{ fontSize: '0.85rem' }}
                        >
                          <Upload size={15} />
                          <span>Upload Your First Song</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {myUploadedTracks
                          .filter((t) => (profileSongFilter === 'all' ? true : t.visibility === profileSongFilter))
                          .map((track) => {
                            const isCurrentPlaying = currentTrack?.id === track.id;
                            return (
                              <div
                                key={track.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.75rem 1rem',
                                  borderRadius: 'var(--radius-md)',
                                  background: isCurrentPlaying ? 'rgba(250, 36, 60, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                  border: isCurrentPlaying ? '1px solid rgba(250, 36, 60, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                  transition: 'all 0.15s ease',
                                  gap: '1rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, overflow: 'hidden' }}>
                                  <div
                                    onClick={() => playTrack(track)}
                                    style={{
                                      width: '2.8rem',
                                      height: '2.8rem',
                                      borderRadius: '0.5rem',
                                      background: getTrackGradient(track.id),
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                      position: 'relative',
                                      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
                                    }}
                                  >
                                    {isCurrentPlaying && isPlaying ? (
                                      <Pause size={16} fill="#ffffff" color="#ffffff" />
                                    ) : (
                                      <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
                                    )}
                                  </div>

                                  <div style={{ overflow: 'hidden', flex: 1 }}>
                                    <div style={{
                                      fontWeight: 600,
                                      fontSize: '0.92rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      color: isCurrentPlaying ? 'var(--apple-pink)' : '#ffffff',
                                    }}>
                                      {track.title}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {track.artist} {track.album ? `• ${track.album}` : ''}
                                    </div>
                                  </div>
                                </div>

                                <div className="desktop-only" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'right', minWidth: '80px' }}>
                                  <div>{formatTime(track.duration)}</div>
                                  <div>{((track.fileSize || 0) / (1024 * 1024)).toFixed(1)} MB</div>
                                </div>

                                {/* 1-Click Interactive Privacy Toggle Badge */}
                                <button
                                  onClick={() => {
                                    const newVis = track.visibility === 'public' ? 'private' : 'public';
                                    toggleTrackVisibility(track.id, track.visibility);
                                    showToast(`Track privacy changed to ${newVis.toUpperCase()}`);
                                  }}
                                  title="Click to toggle Public / Private"
                                  style={{
                                    background: track.visibility === 'public' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                    color: track.visibility === 'public' ? 'var(--apple-green)' : 'var(--text-secondary)',
                                    border: `1px solid ${track.visibility === 'public' ? 'rgba(48, 209, 88, 0.35)' : 'rgba(255, 255, 255, 0.15)'}`,
                                    borderRadius: 'var(--radius-full)',
                                    padding: '0.4rem 0.85rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    flexShrink: 0,
                                  }}
                                >
                                  {track.visibility === 'public' ? <Globe size={13} /> : <Lock size={13} />}
                                  <span>{track.visibility === 'public' ? 'PUBLIC' : 'PRIVATE'}</span>
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <button
                                    onClick={() => setMenuTrack(track)}
                                    title="Song Options"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-secondary)',
                                      padding: '0.4rem',
                                      cursor: 'pointer',
                                      borderRadius: '50%',
                                    }}
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTrack(track.id)}
                                    title="Delete Track"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-tertiary)',
                                      padding: '0.4rem',
                                      cursor: 'pointer',
                                      borderRadius: '50%',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b81')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* PLAYLISTS PRIVACY MANAGER */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                          Playlist Privacy & Visibility
                        </h2>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          Click on any badge below to instantly switch your playlist between Public (everyone can view & listen) and Private.
                        </p>
                      </div>

                      {/* Filter tabs */}
                      <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.25rem', borderRadius: 'var(--radius-full)' }}>
                        <button
                          onClick={() => setProfilePlaylistFilter('all')}
                          style={{
                            background: profilePlaylistFilter === 'all' ? 'var(--apple-pink)' : 'transparent',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          All ({playlists.filter((p) => p.isOwner).length})
                        </button>
                        <button
                          onClick={() => setProfilePlaylistFilter('public')}
                          style={{
                            background: profilePlaylistFilter === 'public' ? 'var(--apple-green)' : 'transparent',
                            color: profilePlaylistFilter === 'public' ? '#000000' : '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Public ({playlists.filter((p) => p.isOwner && p.visibility === 'public').length})
                        </button>
                        <button
                          onClick={() => setProfilePlaylistFilter('private')}
                          style={{
                            background: profilePlaylistFilter === 'private' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Private ({playlists.filter((p) => p.isOwner && p.visibility === 'private').length})
                        </button>
                      </div>
                    </div>

                    {/* Playlist Rows */}
                    {playlists
                      .filter((p) => p.isOwner)
                      .filter((p) => (profilePlaylistFilter === 'all' ? true : p.visibility === profilePlaylistFilter)).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-tertiary)' }}>
                        <FolderLock size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
                          No playlists found in this category
                        </div>
                        <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                          Create playlists to curate your tracks and share with friends or keep them private.
                        </p>
                        <button
                          onClick={() => setShowNewPlaylistModal(true)}
                          className="btn-apple-primary"
                          style={{ fontSize: '0.85rem' }}
                        >
                          <Plus size={15} />
                          <span>Create New Playlist</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {playlists
                          .filter((p) => p.isOwner)
                          .filter((p) => (profilePlaylistFilter === 'all' ? true : p.visibility === profilePlaylistFilter))
                          .map((playlist) => (
                            <div
                              key={playlist.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                transition: 'all 0.15s ease',
                                gap: '1rem',
                              }}
                            >
                              <div
                                onClick={() => handleViewPlaylist(playlist)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, overflow: 'hidden', cursor: 'pointer' }}
                              >
                                <div
                                  style={{
                                    width: '2.8rem',
                                    height: '2.8rem',
                                    borderRadius: '0.5rem',
                                    background: getTrackGradient(playlist.id),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
                                  }}
                                >
                                  <FolderLock size={18} color="#ffffff" />
                                </div>

                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                  <div style={{
                                    fontWeight: 600,
                                    fontSize: '0.92rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: '#ffffff',
                                  }}>
                                    {playlist.name}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {playlist.description || 'Personal playlist'} • {playlist.trackCount} Songs
                                  </div>
                                </div>
                              </div>

                              {/* 1-Click Interactive Playlist Privacy Toggle Badge */}
                              <button
                                onClick={() => togglePlaylistVisibility(playlist.id, playlist.visibility)}
                                title="Click to toggle Public / Private"
                                style={{
                                  background: playlist.visibility === 'public' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                  color: playlist.visibility === 'public' ? 'var(--apple-green)' : 'var(--text-secondary)',
                                  border: `1px solid ${playlist.visibility === 'public' ? 'rgba(48, 209, 88, 0.35)' : 'rgba(255, 255, 255, 0.15)'}`,
                                  borderRadius: 'var(--radius-full)',
                                  padding: '0.4rem 0.85rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  flexShrink: 0,
                                }}
                              >
                                {playlist.visibility === 'public' ? <Globe size={13} /> : <Lock size={13} />}
                                <span>{playlist.visibility === 'public' ? 'PUBLIC' : 'PRIVATE'}</span>
                              </button>

                              <button
                                onClick={() => handleDeletePlaylist(playlist.id)}
                                title="Delete Playlist"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-tertiary)',
                                  padding: '0.4rem',
                                  cursor: 'pointer',
                                  borderRadius: '50%',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b81')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  </div>

  {/* FLOATING MINI PLAYER WITH INLINE PLAYBACK CONTROLS */}
  {currentTrack && (
    <div
      style={{
        position: 'fixed',
        bottom: '72px',
        left: '10px',
        right: '10px',
        maxWidth: '920px',
        margin: '0 auto',
        zIndex: 40,
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
                background: currentTrack.imageUrl ? 'none' : getTrackGradient(currentTrack.id),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden',
              }}
            >
              {currentTrack.imageUrl ? (
                <img
                  src={`/api/jiosaavn/image?url=${encodeURIComponent(currentTrack.imageUrl)}`}
                  alt={currentTrack.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Music size={18} fill="#ffffff" color="#ffffff" />
              )}
            </div>

            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTrack.title}
              </div>
              <div style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTrack.artist} • By @{currentTrack.uploaderName || 'Vault'}
              </div>
            </div>

            {/* Favorite Heart Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentTrack) toggleFavorite(currentTrack);
              }}
              title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
              style={{
                background: 'none',
                border: 'none',
                color: isFavorited ? 'var(--apple-pink)' : 'var(--text-tertiary)',
                padding: '0.35rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Heart size={18} fill={isFavorited ? 'var(--apple-pink)' : 'none'} />
            </button>
          </div>

          {/* Center/Right: Full Playback Transport Controls */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {/* Autoplay Toggle */}
            <button
              onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
              title={isAutoplayEnabled ? 'Autoplay On (Similar songs will play automatically)' : 'Autoplay Off'}
              className="desktop-only"
              style={{
                background: isAutoplayEnabled ? 'rgba(250, 36, 60, 0.15)' : 'none',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: isAutoplayEnabled ? 'var(--apple-pink)' : 'var(--text-tertiary)',
                padding: '0.35rem 0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <Infinity size={15} />
              <span>Autoplay</span>
            </button>

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
              onClick={playPrevTrack}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.35rem' }}
            >
              <SkipBack size={19} fill="#ffffff" />
            </button>

            {/* Play / Pause button */}
            <button
              onClick={togglePlay}
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
              onClick={playNextTrack}
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

            {/* Desktop Mini-Player Volume Slider */}
            <div
              className="desktop-only"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.35rem', marginRight: '0.2rem' }}
            >
              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isMuted ? 'var(--apple-pink)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                style={{
                  width: '75px',
                  height: '4px',
                  accentColor: 'var(--apple-pink)',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* 3-Dots Menu button on Current Track */}
            <button
              onClick={() => setMenuTrack(currentTrack)}
              title="Song Options"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                padding: '0.35rem',
                cursor: 'pointer',
              }}
            >
              <MoreHorizontal size={18} />
            </button>

            {/* Dedicated Full Screen / Expand Mode button */}
            <button
              onClick={() => setIsExpandedPlayer(true)}
              title="Full Screen Mode"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                width: '2.1rem',
                height: '2.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                marginLeft: '0.2rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* MACOS APPLE MUSIC FULLSCREEN PLAYER MATCHING SCREENSHOT EXACTLY */}
  {isExpandedPlayer && currentTrack && (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        overflow: 'hidden',
        userSelect: 'none',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      {/* ATMOSPHERIC GAUSSIAN BLURRED BACKDROP */}
      <div
        style={{
          position: 'absolute',
          inset: '-20%',
          background: currentTrack.imageUrl
            ? `url(/api/jiosaavn/image?url=${encodeURIComponent(currentTrack.imageUrl)}) center/cover no-repeat`
            : getTrackGradient(currentTrack.id),
          filter: 'blur(120px) brightness(0.28) saturate(1.6)',
          opacity: 0.9,
          pointerEvents: 'none',
          zIndex: 0,
          transform: isPlaying ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 3s ease-in-out',
        }}
      />
      {/* DARK AMBIENT RADIAL VIGNETTE OVERLAY */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(12, 12, 16, 0.45) 0%, rgba(3, 3, 5, 0.92) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* TOP-RIGHT CORNER CONTROLS: MINIMIZE & CLOSE */}
      <div
        style={{
          position: 'absolute',
          top: '1.75rem',
          right: '2rem',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
        }}
      >
        <button
          onClick={() => setIsExpandedPlayer(false)}
          title="Minimize Fullscreen"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.75)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <Minimize2 size={16} />
        </button>
        <button
          onClick={() => setIsExpandedPlayer(false)}
          title="Close Fullscreen"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.75)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* CENTER PLAYER CONTENT COLUMN */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* ALBUM ARTWORK */}
        <div
          style={{
            width: '100%',
            maxWidth: 'min(440px, 80vw)',
            aspectRatio: '1 / 1',
            maxHeight: '46vh',
            borderRadius: '14px',
            background: currentTrack.imageUrl ? 'none' : getTrackGradient(currentTrack.id),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 24px 65px rgba(0, 0, 0, 0.8), 0 4px 20px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            transform: isPlaying ? 'scale(1)' : 'scale(0.96)',
            transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {currentTrack.imageUrl ? (
            <img
              src={`/api/jiosaavn/image?url=${encodeURIComponent(currentTrack.imageUrl)}`}
              alt={currentTrack.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Music size={80} fill="#ffffff" color="#ffffff" style={{ opacity: 0.95 }} />
          )}

          {/* Specular gloss highlight */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '42%',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* SONG TITLE */}
        <h1
          style={{
            fontSize: 'clamp(1.35rem, 2.5vw, 1.7rem)',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            marginTop: '1.6rem',
            marginBottom: '0.3rem',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentTrack.title}
        </h1>

        {/* ARTIST — ALBUM SUBTITLE */}
        <div
          style={{
            fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.65)',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentTrack.artist} — {currentTrack.album || currentTrack.title}
        </div>

        {/* LOSSLESS BADGE */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            marginTop: '0.5rem',
            color: 'rgba(255, 255, 255, 0.55)',
            fontSize: '0.75rem',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12c2.5-6 5.5-6 8 0s5.5 6 8 0 3.5-3 4-3" />
          </svg>
          <span>Lossless</span>
        </div>

        {/* ACTION CHIPS: FAVORITE & START RADIO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', marginTop: '0.85rem' }}>
          <button
            onClick={() => toggleFavorite(currentTrack)}
            style={{
              background: isFavorited ? 'rgba(250, 36, 60, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${isFavorited ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: 'var(--radius-full)',
              padding: '0.45rem 1.1rem',
              color: isFavorited ? 'var(--apple-pink)' : '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Heart size={15} fill={isFavorited ? 'var(--apple-pink)' : 'none'} />
            <span>{isFavorited ? 'Favorited' : 'Favorite'}</span>
          </button>

          <button
            onClick={() => handleStartRadio(currentTrack)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-full)',
              padding: '0.45rem 1.1rem',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Radio size={15} color="var(--apple-pink)" />
            <span>Start Radio</span>
          </button>
        </div>

        {/* TIMELINE SCRUBBER */}
        <div
          style={{
            width: '100%',
            marginTop: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.8rem',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          }}
        >
          <span style={{ minWidth: '34px', textAlign: 'left' }}>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || currentTrack.duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{
              flex: 1,
              height: '4px',
              accentColor: '#ffffff',
              cursor: 'pointer',
            }}
          />
          <span style={{ minWidth: '38px', textAlign: 'right' }}>
            -{formatTime(Math.max(0, (duration || currentTrack.duration) - currentTime))}
          </span>
        </div>

        {/* TRANSPORT CONTROLS ROW UNDER SCRUBBER */}
        <div
          style={{
            width: '100%',
            marginTop: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 0.2rem',
          }}
        >
          {/* LEFT GROUP: Volume speaker + volume slider + ••• */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              style={{
                background: 'none',
                border: 'none',
                color: isMuted ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.75)',
                cursor: 'pointer',
                padding: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = isMuted ? 'var(--apple-pink)' : 'rgba(255, 255, 255, 0.75)')
              }
            >
              {isMuted || volume === 0 ? <VolumeX size={19} /> : volume < 0.5 ? <Volume1 size={19} /> : <Volume2 size={19} />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              style={{
                width: '64px',
                height: '3px',
                accentColor: '#ffffff',
                cursor: 'pointer',
              }}
            />

            <button
              onClick={() => setMenuTrack(currentTrack)}
              title="More Options"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.75)',
                cursor: 'pointer',
                padding: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)')}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* CENTER GROUP: SkipBack + Play/Pause + SkipForward (crisp white glyphs) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
            <button
              onClick={playPrevTrack}
              title="Previous Track"
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <SkipBack size={26} fill="#ffffff" color="#ffffff" />
            </button>

            <button
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isBuffering ? (
                <Loader2 size={32} className="animate-spin" color="#ffffff" />
              ) : isPlaying ? (
                <Pause size={34} fill="#ffffff" color="#ffffff" />
              ) : (
                <Play size={34} fill="#ffffff" color="#ffffff" style={{ marginLeft: '3px' }} />
              )}
            </button>

            <button
              onClick={playNextTrack}
              title="Next Track"
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <SkipForward size={26} fill="#ffffff" color="#ffffff" />
            </button>
          </div>

          {/* RIGHT GROUP: Lyrics / Quote Bubble */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => showToast('Lyrics feature synchronized with Apple Music catalog')}
              title="Lyrics"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.75)',
                cursor: 'pointer',
                padding: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)')}
            >
              <MessageSquareQuote size={20} />
            </button>
          </div>
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
          onClick={() => setActiveTab('explore')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            color: activeTab === 'explore' ? 'var(--apple-pink)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 600,
          }}
        >
          <Radio size={20} />
          <span>Explore</span>
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

        <button
          onClick={() => setActiveTab('profile')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
            color: activeTab === 'profile' ? 'var(--apple-pink)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 600,
          }}
        >
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

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
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewPlaylistVisibility('private')}
                    className={`btn-apple-secondary ${newPlaylistVisibility === 'private' ? 'btn-apple-primary' : ''}`}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 600,
                      border: newPlaylistVisibility === 'private' ? '1px solid rgba(250, 36, 60, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Lock size={14} color="#ffffff" />
                    <span style={{ color: '#ffffff' }}>Private (Only Me)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPlaylistVisibility('public')}
                    className={`btn-apple-secondary ${newPlaylistVisibility === 'public' ? 'btn-apple-primary' : ''}`}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 600,
                      border: newPlaylistVisibility === 'public' ? '1px solid rgba(250, 36, 60, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Globe size={14} color="#ffffff" />
                    <span style={{ color: '#ffffff' }}>Public (Everyone)</span>
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

      {/* TRACK CONTEXT ACTION SHEET / 3-DOTS MENU MODAL */}
      {menuTrack && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 95,
            padding: '1.25rem',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setMenuTrack(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="apple-glass"
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '1.5rem',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
            }}
          >
            {/* Track Info Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.6rem',
                background: menuTrack.imageUrl ? 'none' : getTrackGradient(menuTrack.id),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {menuTrack.imageUrl ? (
                  <img
                    src={`/api/jiosaavn/image?url=${encodeURIComponent(menuTrack.imageUrl)}`}
                    alt={menuTrack.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Music size={20} fill="#ffffff" color="#ffffff" />
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {menuTrack.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {menuTrack.artist} • By @{menuTrack.uploaderName || 'Vault'}
                </div>
              </div>
            </div>

            {/* Actions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {/* Play Now */}
              <button
                onClick={() => {
                  playTrack(menuTrack);
                  setMenuTrack(null);
                }}
                className="btn-apple-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.7rem 0.85rem', width: '100%', gap: '0.75rem', fontSize: '0.875rem' }}
              >
                <Play size={16} fill="currentColor" />
                <span>Play Now</span>
              </button>

              {/* Add to Playlist */}
              <button
                onClick={() => {
                  const trk = menuTrack;
                  setMenuTrack(null);
                  setTrackToAddToPlaylist(trk);
                }}
                className="btn-apple-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.7rem 0.85rem', width: '100%', gap: '0.75rem', fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                <span>Add to Playlist...</span>
              </button>

              {/* Start Radio */}
              <button
                onClick={() => {
                  handleStartRadio(menuTrack);
                  setMenuTrack(null);
                }}
                className="btn-apple-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.7rem 0.85rem', width: '100%', gap: '0.75rem', fontSize: '0.875rem' }}
              >
                <Radio size={16} color="var(--apple-pink)" />
                <span>Start Radio</span>
              </button>

              {/* Add / Remove Favorite */}
              <button
                onClick={() => {
                  toggleFavorite(menuTrack);
                  setMenuTrack(null);
                }}
                className="btn-apple-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '0.7rem 0.85rem',
                  width: '100%',
                  gap: '0.75rem',
                  fontSize: '0.875rem',
                  color: favoriteIds.has(menuTrack.id) ? 'var(--apple-pink)' : '#ffffff',
                }}
              >
                <Heart size={16} fill={favoriteIds.has(menuTrack.id) ? 'var(--apple-pink)' : 'none'} />
                <span>{favoriteIds.has(menuTrack.id) ? 'Remove from Favorites' : 'Add to Favorites'}</span>
              </button>

              {/* Toggle Public / Private (If Owner) */}
              {menuTrack.isOwner && (
                <button
                  onClick={() => {
                    const newVis = menuTrack.visibility === 'public' ? 'private' : 'public';
                    toggleTrackVisibility(menuTrack.id, menuTrack.visibility);
                    showToast(`Song set to ${newVis.toUpperCase()}`);
                    setMenuTrack(null);
                  }}
                  className="btn-apple-secondary"
                  style={{ justifyContent: 'flex-start', padding: '0.7rem 0.85rem', width: '100%', gap: '0.75rem', fontSize: '0.875rem' }}
                >
                  {menuTrack.visibility === 'public' ? <Lock size={16} /> : <Globe size={16} />}
                  <span>Make {menuTrack.visibility === 'public' ? 'Private (Only Me)' : 'Public (Everyone)'}</span>
                </button>
              )}

              {/* Share / Copy Link */}
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/workspace?track=${menuTrack.id} - "${menuTrack.title}" by ${menuTrack.artist}`
                    );
                    showToast('Song link copied to clipboard!');
                  }
                  setMenuTrack(null);
                }}
                className="btn-apple-secondary"
                style={{ justifyContent: 'flex-start', padding: '0.7rem 0.85rem', width: '100%', gap: '0.75rem', fontSize: '0.875rem' }}
              >
                <Share2 size={16} />
                <span>Share Song Link</span>
              </button>

              {/* Delete Track (If Owner) */}
              {menuTrack.isOwner && (
                <button
                  onClick={() => {
                    const id = menuTrack.id;
                    setMenuTrack(null);
                    handleDeleteTrack(id);
                  }}
                  className="btn-apple-secondary"
                  style={{ justifyContent: 'flex-start', padding: '0.7rem 0.85rem', width: '100%', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--apple-pink)' }}
                >
                  <Trash2 size={16} color="var(--apple-pink)" />
                  <span>Delete from Vault</span>
                </button>
              )}
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setMenuTrack(null)}
              className="btn-apple-secondary"
              style={{ justifyContent: 'center', padding: '0.6rem', marginTop: '0.35rem', color: 'var(--text-tertiary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* QUICK TOAST NOTIFICATION */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20, 20, 24, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '999px',
          padding: '0.6rem 1.4rem',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#ffffff',
          animation: 'fadeIn 0.2s ease',
        }}>
          <CheckCircle2 size={16} color="var(--apple-green)" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
