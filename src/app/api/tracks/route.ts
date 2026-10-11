import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getSession } from '@/lib/auth';
import { db, ensureDbInitialized } from '@/lib/db';
import { tracks, users } from '@/lib/db/schema';
import { eq, or, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'my' | null

    let condition;
    if (filter === 'my') {
      condition = eq(tracks.userId, session.userId);
    } else {
      // Show everyone's public songs + user's own private songs
      condition = or(
        eq(tracks.visibility, 'public'),
        eq(tracks.userId, session.userId)
      );
    }

    const allTracks = await db
      .select({
        id: tracks.id,
        userId: tracks.userId,
        title: tracks.title,
        artist: tracks.artist,
        album: tracks.album,
        duration: tracks.duration,
        fileName: tracks.fileName,
        fileSize: tracks.fileSize,
        visibility: tracks.visibility,
        createdAt: tracks.createdAt,
        uploaderName: users.username,
        uploaderDisplayName: users.displayName,
      })
      .from(tracks)
      .leftJoin(users, eq(tracks.userId, users.id))
      .where(condition)
      .orderBy(desc(tracks.createdAt));

    const enrichedTracks = allTracks.map((t) => ({
      ...t,
      isOwner: t.userId === session.userId,
    }));

    return NextResponse.json({ tracks: enrichedTracks });
  } catch (error) {
    console.error('Fetch tracks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
  }
}

// Toggle or update track visibility (public/private)
export async function PATCH(req: NextRequest) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { trackId, visibility } = body;

    if (!trackId || (visibility !== 'public' && visibility !== 'private')) {
      return NextResponse.json({ error: 'Valid trackId and visibility required' }, { status: 400 });
    }

    const found = await db
      .select()
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    const track = found[0];
    if (track.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Only owner can change visibility' }, { status: 403 });
    }

    await db
      .update(tracks)
      .set({ visibility })
      .where(eq(tracks.id, trackId));

    return NextResponse.json({ success: true, trackId, visibility });
  } catch (error) {
    console.error('Update visibility error:', error);
    return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get('id');

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID required' }, { status: 400 });
    }

    const found = await db
      .select()
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    const track = found[0];
    if (track.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Remove file from disk if it exists
    if (fs.existsSync(track.filePath)) {
      try {
        fs.unlinkSync(track.filePath);
      } catch (err) {
        console.warn('Failed to delete physical file:', err);
      }
    }

    // Delete from DB
    await db.delete(tracks).where(eq(tracks.id, trackId));

    return NextResponse.json({ success: true, message: 'Track deleted' });
  } catch (error) {
    console.error('Delete track error:', error);
    return NextResponse.json({ error: 'Failed to delete track' }, { status: 500 });
  }
}
