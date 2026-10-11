import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import * as mm from 'music-metadata';
import { getSession } from '@/lib/auth';
import { db, ensureDbInitialized } from '@/lib/db';
import { tracks } from '@/lib/db/schema';

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/m4a',
  'audio/mp4',
];

export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Check MIME type or extension
    const originalName = file.name || 'unnamed_audio.mp3';
    const ext = path.extname(originalName).toLowerCase();
    const validExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];

    if (!validExtensions.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid audio format. Allowed: MP3, WAV, FLAC, OGG, M4A, AAC' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileSize = buffer.length;

    // Parse audio metadata (title, artist, duration)
    let title = path.basename(originalName, ext);
    let artist = 'Unknown Artist';
    let album = '';
    let duration = 0;

    try {
      const metadata = await mm.parseBuffer(buffer, file.type || 'audio/mpeg');
      if (metadata.common.title) title = metadata.common.title;
      if (metadata.common.artist) artist = metadata.common.artist;
      if (metadata.common.album) album = metadata.common.album;
      if (metadata.format.duration) duration = Math.round(metadata.format.duration);
    } catch (metaErr) {
      console.warn('Metadata parsing warning (using fallback filename):', metaErr);
    }

    // Save to disk
    const trackId = crypto.randomUUID();
    const storedFileName = `${trackId}${ext}`;
    const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const diskPath = path.join(uploadsDir, storedFileName);
    fs.writeFileSync(diskPath, buffer);

    const now = Date.now();
    await db.insert(tracks).values({
      id: trackId,
      userId: session.userId,
      title,
      artist,
      album,
      duration,
      filePath: diskPath,
      fileName: originalName,
      mimeType: file.type || 'audio/mpeg',
      fileSize,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      track: {
        id: trackId,
        title,
        artist,
        album,
        duration,
        fileSize,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process audio upload' }, { status: 500 });
  }
}
