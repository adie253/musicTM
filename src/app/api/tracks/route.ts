import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getSession } from '@/lib/auth';
import { db, ensureDbInitialized } from '@/lib/db';
import { tracks } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userTracks = await db
      .select({
        id: tracks.id,
        userId: tracks.userId,
        title: tracks.title,
        artist: tracks.artist,
        album: tracks.album,
        duration: tracks.duration,
        fileName: tracks.fileName,
        fileSize: tracks.fileSize,
        createdAt: tracks.createdAt,
      })
      .from(tracks)
      .where(eq(tracks.userId, session.userId))
      .orderBy(desc(tracks.createdAt));

    return NextResponse.json({ tracks: userTracks });
  } catch (error) {
    console.error('Fetch tracks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
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

    // Remove file from disk
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
