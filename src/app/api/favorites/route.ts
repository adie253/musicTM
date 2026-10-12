import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';
import { db, ensureDbInitialized } from '@/lib/db';
import { favorites, tracks, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const favList = await db
      .select({
        id: favorites.id,
        trackId: favorites.trackId,
        trackData: favorites.trackData,
        createdAt: favorites.createdAt,
      })
      .from(favorites)
      .where(eq(favorites.userId, session.userId))
      .orderBy(desc(favorites.createdAt));

    const favoriteIds = favList.map((f) => f.trackId);

    // Fetch matching local vault tracks if any
    const formattedTracks = await Promise.all(
      favList.map(async (fav) => {
        // If trackData was stored (e.g., online stream metadata), parse it
        if (fav.trackData) {
          try {
            const parsed = JSON.parse(fav.trackData);
            return {
              ...parsed,
              id: fav.trackId,
              isFavorited: true,
              favoritedAt: fav.createdAt,
            };
          } catch {
            // fallback
          }
        }

        // Check if it's a local vault track
        const vaultTrack = await db
          .select({
            id: tracks.id,
            title: tracks.title,
            artist: tracks.artist,
            album: tracks.album,
            duration: tracks.duration,
            fileSize: tracks.fileSize,
            fileName: tracks.fileName,
            visibility: tracks.visibility,
            createdAt: tracks.createdAt,
            uploaderName: users.username,
            uploaderDisplayName: users.displayName,
          })
          .from(tracks)
          .leftJoin(users, eq(tracks.userId, users.id))
          .where(eq(tracks.id, fav.trackId))
          .limit(1);

        if (vaultTrack.length > 0) {
          const vt = vaultTrack[0];
          return {
            ...vt,
            isOwner: false,
            isFavorited: true,
            favoritedAt: fav.createdAt,
          };
        }

        return {
          id: fav.trackId,
          title: 'Unknown Track',
          artist: 'Unknown Artist',
          duration: 0,
          fileSize: 0,
          visibility: 'public' as const,
          createdAt: fav.createdAt,
          isFavorited: true,
          favoritedAt: fav.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      favoriteIds,
      tracks: formattedTracks,
    });
  } catch (error) {
    console.error('Fetch favorites error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
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
    const { trackId, trackData } = body;

    if (!trackId) {
      return NextResponse.json({ error: 'Missing trackId' }, { status: 400 });
    }

    // Check if already favorited
    const existing = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, session.userId),
          eq(favorites.trackId, trackId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Toggle OFF: Remove from favorites
      await db
        .delete(favorites)
        .where(
          and(
            eq(favorites.userId, session.userId),
            eq(favorites.trackId, trackId)
          )
        );

      return NextResponse.json({
        success: true,
        favorited: false,
        trackId,
        message: 'Removed from Favorites',
      });
    }

    // Toggle ON: Add to favorites
    const newId = crypto.randomUUID();
    const serializedData = trackData ? JSON.stringify(trackData) : null;

    await db.insert(favorites).values({
      id: newId,
      userId: session.userId,
      trackId,
      trackData: serializedData,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      favorited: true,
      trackId,
      message: 'Added to Favorites',
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    );
  }
}
