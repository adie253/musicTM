import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const configuredJwtSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !configuredJwtSecret) {
  throw new Error('JWT_SECRET must be configured in production.');
}
const JWT_SECRET = new TextEncoder().encode(
  configuredJwtSecret || 'local-development-only-secret-do-not-use-in-production'
);

export const COOKIE_NAME = 'vault_session';

export interface SessionUser {
  userId: string;
  username: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.userId,
    username: user.username,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub) return null;
    return {
      userId: payload.sub as string,
      username: (payload.username as string) || '',
      email: (payload.email as string) || '',
      role: (payload.role as string) || 'user',
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
