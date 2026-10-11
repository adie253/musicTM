import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';
import { db, ensureDbInitialized } from '@/lib/db';
import { playlists, playlistTracks, users } from '@/lib/db/schema';
import { eq, or, and, desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'my' | 'public' | null

    let conditions;
    if (filter === 'my') {
      conditions = eq(playlists.userId, session.userId);
    } else if (filter === 'public') {
      conditions = eq(playlists.visibility, 'public');
    } else {
      // Both user's own playlists AND all public playlists
      conditions = or(
        eq(playlists.userId, session.userId),
        eq(playlists.visibility, 'public')
      );
    }

    const result = await db
      .select({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        visibility: playlists.visibility,
        userId: playlists.userId,
        creatorName: users.username,
        createdAt: playlists.createdAt,
        updatedAt: playlists.updatedAt,
      })
      .from(playlists)
      .leftJoin(users, eq(playlists.userId, users.id))
      .where(conditions)
      .orderBy(desc(playlists.updatedAt));

    // Get track counts for each playlist
    const playlistsWithCount = await Promise.all(
      result.map(async (pl) => {
        const countRes = await db
          .select({ count: sql<number>`count(*)` })
          .from(playlistTracks)
          .where(eq(playlistTracks.playlistId, pl.id));
        return {
          ...pl,
          trackCount: countRes[0]?.count || 0,
          isOwner: pl.userId === session.userId,
        };
      })
    );

    return NextResponse.json({ playlists: playlistsWithCount });
  } catch (error) {
    console.error('Fetch playlists error:', error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, visibility } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 });
    }

    const playlistId = crypto.randomUUID();
    const now = Date.now();
    const finalVisibility = visibility === 'public' ? 'public' : 'private';

    await db.insert(playlists).values({
      id: playlistId,
      userId: session.userId,
      name: name.trim(),
      description: description?.trim() || '',
      visibility: finalVisibility,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlistId,
        name: name.trim(),
        description: description?.trim() || '',
        visibility: finalVisibility,
        userId: session.userId,
        isOwner: true,
        trackCount: 0,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}
