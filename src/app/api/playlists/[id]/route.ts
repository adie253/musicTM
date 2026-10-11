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
    if (playlist.visibility === 'private' && playlist.userId !== session.userId) {
      return NextResponse.json({ error: 'Access denied to private playlist' }, { status: 403 });
    }

    // Fetch ordered tracks
    const playlistTrackRows = await db
      .select({
        id: tracks.id,
        title: tracks.title,
        artist: tracks.artist,
        album: tracks.album,
        duration: tracks.duration,
        fileSize: tracks.fileSize,
        orderIndex: playlistTracks.orderIndex,
        addedAt: playlistTracks.addedAt,
      })
      .from(playlistTracks)
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .where(eq(playlistTracks.playlistId, id))
      .orderBy(asc(playlistTracks.orderIndex));

    return NextResponse.json({
      playlist: {
        ...playlist,
        isOwner: playlist.userId === session.userId,
      },
      tracks: playlistTrackRows,
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
    const { trackId } = body;

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
