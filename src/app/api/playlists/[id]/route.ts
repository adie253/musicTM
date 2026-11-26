import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';
import { db, ensureDbInitialized } from '@/lib/db';
import { playlists, playlistTracks, tracks, users } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const found = await db
      .select({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        visibility: playlists.visibility,
        userId: playlists.userId,
        creatorName: users.username,
        createdAt: playlists.createdAt,
      })
      .from(playlists)
      .leftJoin(users, eq(playlists.userId, users.id))
      .where(eq(playlists.id, id))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    const playlist = found[0];

    // Check visibility
    const canViewPrivateTracks = playlist.userId === session.userId || session.role === 'admin';
    if (playlist.visibility === 'private' && !canViewPrivateTracks) {
      return NextResponse.json({ error: 'Access denied to private playlist' }, { status: 403 });
    }

    // Fetch ordered tracks (supports both local vault tracks and online tracks stored in trackData)
    const playlistTrackRows = await db
      .select({
        ptTrackId: playlistTracks.trackId,
        trackData: playlistTracks.trackData,
        orderIndex: playlistTracks.orderIndex,
        addedAt: playlistTracks.addedAt,
        vaultId: tracks.id,
        userId: tracks.userId,
        visibility: tracks.visibility,
        title: tracks.title,
        artist: tracks.artist,
        album: tracks.album,
        duration: tracks.duration,
        fileSize: tracks.fileSize,
      })
      .from(playlistTracks)
      .leftJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .where(eq(playlistTracks.playlistId, id))
      .orderBy(asc(playlistTracks.orderIndex));

    const resolvedTracks = playlistTrackRows
      .map((row) => {
        if (row.vaultId) {
          if (
            !canViewPrivateTracks &&
            row.visibility !== 'public' &&
            row.userId !== session.userId
          ) {
            return null;
          }
          return {
            id: row.vaultId,
            title: row.title || 'Untitled',
            artist: row.artist || 'Unknown Artist',
            album: row.album || undefined,
            duration: row.duration || 0,
            fileSize: row.fileSize || 0,
            visibility: (row.visibility as 'public' | 'private') || 'public',
            orderIndex: row.orderIndex,
            addedAt: row.addedAt,
          };
        }

        if (row.trackData) {
          try {
            const parsed = JSON.parse(row.trackData);
            return {
              ...parsed,
              id: row.ptTrackId,
              orderIndex: row.orderIndex,
              addedAt: row.addedAt,
            };
          } catch {
            // fall through
          }
        }
        return null;
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    return NextResponse.json({
      playlist: {
        ...playlist,
        isOwner: playlist.userId === session.userId,
      },
      tracks: resolvedTracks,
    });
  } catch (error) {
    console.error('Fetch playlist detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: 500 });
  }
}

// Add a track to playlist
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { trackId, trackData } = body;

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID required' }, { status: 400 });
    }

    // Verify ownership of the playlist
    const found = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, id))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (found[0].userId !== session.userId) {
      return NextResponse.json({ error: 'Only playlist owner can modify it' }, { status: 403 });
    }

    // Check if already in playlist
    const existing = await db
      .select()
      .from(playlistTracks)
      .where(and(eq(playlistTracks.playlistId, id), eq(playlistTracks.trackId, trackId)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ message: 'Track already in playlist' });
    }

    await db.insert(playlistTracks).values({
      id: crypto.randomUUID(),
      playlistId: id,
      trackId,
      trackData: trackData ? JSON.stringify(trackData) : null,
      orderIndex: Date.now(),
      addedAt: Date.now(),
    });

    // Update playlist updatedAt
    await db
      .update(playlists)
      .set({ updatedAt: Date.now() })
      .where(eq(playlists.id, id));

    return NextResponse.json({ success: true, message: 'Track added to playlist' });
  } catch (error) {
    console.error('Add track to playlist error:', error);
    return NextResponse.json({ error: 'Failed to add track' }, { status: 500 });
  }
}

// Update playlist (visibility, name, description)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, visibility } = body;

    // Verify ownership
    const found = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, id))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (found[0].userId !== session.userId) {
      return NextResponse.json({ error: 'Only playlist owner can modify it' }, { status: 403 });
    }

    const updateData: {
      name?: string;
      description?: string;
      visibility?: 'private' | 'public';
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }
    if (typeof description === 'string') {
      updateData.description = description.trim();
    }
    if (visibility === 'public' || visibility === 'private') {
      updateData.visibility = visibility;
    }

    await db
      .update(playlists)
      .set(updateData)
      .where(eq(playlists.id, id));

    return NextResponse.json({
      success: true,
      message: 'Playlist updated successfully',
      playlist: {
        id,
        visibility: updateData.visibility || found[0].visibility,
      },
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}

// Delete playlist or remove track from playlist
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get('trackId');

    const found = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, id))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (found[0].userId !== session.userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    if (trackId) {
      // Remove specific track from playlist
      await db
        .delete(playlistTracks)
        .where(and(eq(playlistTracks.playlistId, id), eq(playlistTracks.trackId, trackId)));
      return NextResponse.json({ success: true, message: 'Track removed from playlist' });
    } else {
      // Delete entire playlist
      await db.delete(playlistTracks).where(eq(playlistTracks.playlistId, id));
      await db.delete(playlists).where(eq(playlists.id, id));
      return NextResponse.json({ success: true, message: 'Playlist deleted' });
    }
  } catch (error) {
    console.error('Delete playlist action error:', error);
    return NextResponse.json({ error: 'Failed to process delete action' }, { status: 500 });
  }
}
