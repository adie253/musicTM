import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Determine database connection URL
const isCloudUrl =
  process.env.DATABASE_URL?.startsWith('libsql://') ||
  process.env.DATABASE_URL?.startsWith('https://');

let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  // Local fallback: use /tmp in serverless or ./data in local development
  const baseDir = process.env.VERCEL
    ? '/tmp'
    : path.resolve(process.cwd(), 'data');

  try {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  } catch {
    // Ignore read-only errors in serverless
  }

  dbUrl = `file:${path.join(baseDir, 'vault.db').replace(/\\/g, '/')}`;
}

export const client = createClient({
  url: dbUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Auto-initialize SQLite tables if not present
let initialized = false;
export async function ensureDbInitialized() {
  if (initialized) return;

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT 'Unknown Artist',
      album TEXT,
      duration INTEGER NOT NULL DEFAULT 0,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
      file_size INTEGER NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      audio_data BLOB,
      created_at INTEGER NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      id TEXT PRIMARY KEY,
      playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0,
      added_at INTEGER NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      track_id TEXT NOT NULL,
      track_data TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  initialized = true;
}
