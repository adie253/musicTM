const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  });
}

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  try {
    await client.execute("ALTER TABLE tracks ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';");
    console.log('✅ Added visibility column to tracks table in Turso cloud!');
  } catch (err) {
    if (err.message && err.message.includes('duplicate column')) {
      console.log('Column visibility already exists.');
    } else {
      console.log('Alter note:', err.message);
    }
  }

  // Update any existing tracks to 'public'
  await client.execute("UPDATE tracks SET visibility = 'public' WHERE visibility IS NULL;");
  console.log('✅ All existing tracks marked as public.');
}

main().catch(console.error);
