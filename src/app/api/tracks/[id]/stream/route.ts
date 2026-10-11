import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getSession } from '@/lib/auth';
import { db, client, ensureDbInitialized } from '@/lib/db';
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
      .select({
        id: tracks.id,
        userId: tracks.userId,
        title: tracks.title,
        filePath: tracks.filePath,
        mimeType: tracks.mimeType,
        fileSize: tracks.fileSize,
      })
      .from(tracks)
      .where(eq(tracks.id, id))
      .limit(1);

    if (foundTrack.length === 0) {
      return new NextResponse('Track not found', { status: 404 });
    }

    const track = foundTrack[0];

    // Access control
    let hasAccess = track.userId === session.userId;
    if (!hasAccess) {
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

    const range = req.headers.get('range');
    const fileSize = track.fileSize;
    const mimeType = track.mimeType || 'audio/mpeg';

    // 1. STREAM FROM LOCAL DISK (if file exists)
    if (fs.existsSync(track.filePath)) {
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          return new NextResponse('Requested range not satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${fileSize}` },
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
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache, private',
          },
        });
      }

      const nodeStream = fs.createReadStream(track.filePath);
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;
      return new Response(webStream, {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize.toString(),
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache, private',
        },
      });
    }

    // 2. STREAM FROM TURSO CLOUD DATABASE (BLOB substr streaming)
    // Check if audio_data is stored in Turso
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse('Requested range not satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      const chunkSize = end - start + 1;
      // SQLite substr is 1-indexed: substr(data, start + 1, chunkSize)
      const res = await client.execute({
        sql: 'SELECT substr(audio_data, ?, ?) as chunk FROM tracks WHERE id = ?;',
        args: [start + 1, chunkSize, id],
      });

      if (!res.rows[0] || !res.rows[0].chunk) {
        return new NextResponse('Audio stream data not found in vault. Please re-upload this track.', { status: 404 });
      }

      const chunkBuffer = Buffer.from(res.rows[0].chunk as any);

      return new Response(chunkBuffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkBuffer.length.toString(),
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache, private',
        },
      });
    }

    // Full audio fetch from Turso
    const res = await client.execute({
      sql: 'SELECT audio_data FROM tracks WHERE id = ?;',
      args: [id],
    });

    if (!res.rows[0] || !res.rows[0].audio_data) {
      return new NextResponse('Audio stream data not found. Please re-upload this track.', { status: 404 });
    }

    const fullBuffer = Buffer.from(res.rows[0].audio_data as any);

    return new Response(fullBuffer, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fullBuffer.length.toString(),
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache, private',
      },
    });
  } catch (error) {
    console.error('Audio streaming error:', error);
    return new NextResponse('Audio streaming failed', { status: 500 });
  }
}
