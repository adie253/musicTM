import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, ensureDbInitialized } from '@/lib/db';
import { users, tracks } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    await ensureDbInitialized();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.toLowerCase() || '';

    // Fetch users (exclude sensitive fields like passwordHash and email)
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get public tracks count for each user
    const allPublicTracks = await db
      .select({
        userId: tracks.userId,
      })
      .from(tracks)
      .where(eq(tracks.visibility, 'public'));

    const trackCounts: Record<string, number> = {};
    for (const t of allPublicTracks) {
      trackCounts[t.userId] = (trackCounts[t.userId] || 0) + 1;
    }

    let result = allUsers.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      publicTrackCount: trackCounts[u.id] || 0,
      isSelf: u.id === session.userId,
      createdAt: u.createdAt,
    }));

    if (q) {
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.displayName && u.displayName.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
