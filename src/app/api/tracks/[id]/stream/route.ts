import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getSession } from '@/lib/auth';
import { db, ensureDbInitialized } from '@/lib/db';
import { tracks, playlists, playlistTracks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return new NextResponse('Authentication required', { status: 401 });
    }

    const { id } = await params;

    const foundTrack = await db
      .select()
      .from(tracks)
      .where(eq(tracks.id, id))
      .limit(1);

    if (foundTrack.length === 0) {
      return new NextResponse('Track not found', { status: 404 });
    }

    const track = foundTrack[0];

    // Access control:
    // If track belongs to user -> allow
    let hasAccess = track.userId === session.userId;

    if (!hasAccess) {
      // Check if track is part of any public playlist
      const publicRefs = await db
        .select({ playlistId: playlistTracks.playlistId })
        .from(playlistTracks)
        .innerJoin(playlists, eq(playlistTracks.playlistId, playlists.id))
        .where(eq(playlistTracks.trackId, id))
        .limit(1);

      if (publicRefs.length > 0) {
        hasAccess = true;
      }
    }

    if (!hasAccess && session.role !== 'admin') {
      return new NextResponse('Access denied', { status: 403 });
    }

    if (!fs.existsSync(track.filePath)) {
      return new NextResponse('Audio file missing on disk', { status: 404 });
    }

    const stat = fs.statSync(track.filePath);
    const fileSize = stat.size;
    const range = req.headers.get('range');

    if (range) {
      // Byte Range Request (Seeking / Scrubbing)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse('Requested range not satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const nodeStream = fs.createReadStream(track.filePath, { start, end });
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': track.mimeType || 'audio/mpeg',
          'Cache-Control': 'no-cache, private',
        },
      });
    }

    // Full Stream
    const nodeStream = fs.createReadStream(track.filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': track.mimeType || 'audio/mpeg',
        'Cache-Control': 'no-cache, private',
      },
    });
  } catch (error) {
    console.error('Audio streaming error:', error);
    return new NextResponse('Audio streaming failed', { status: 500 });
  }
}
