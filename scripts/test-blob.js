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

async function testBlob() {
  await client.execute('CREATE TABLE IF NOT EXISTS test_blob (id TEXT PRIMARY KEY, data BLOB);');
  const buf = Buffer.from('hello audio streaming world byte test');
  await client.execute({
    sql: 'INSERT OR REPLACE INTO test_blob (id, data) VALUES (?, ?);',
    args: ['1', buf],
  });
  const res = await client.execute("SELECT substr(data, 7, 5) as slice FROM test_blob WHERE id = '1';");
  const sliceBuf = Buffer.from(res.rows[0].slice);
  console.log('BLOB slice result:', sliceBuf.toString());
  await client.execute('DROP TABLE test_blob;');
}

testBlob().catch(console.error);
