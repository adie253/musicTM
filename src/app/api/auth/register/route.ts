import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, ensureDbInitialized } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { hashPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await req.json();
    const { username, email, password, displayName } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required.' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Check if username or email already exists
    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.username, username.trim()), eq(users.email, email.trim().toLowerCase())))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Username or email already in use.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = Date.now();

    await db.insert(users).values({
      id: userId,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      displayName: displayName?.trim() || username.trim(),
      role: 'user',
      createdAt: now,
    });

    const sessionUser = {
      userId,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      role: 'user',
    };

    const token = await createSessionToken(sessionUser);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account.' },
      { status: 500 }
    );
  }
}
